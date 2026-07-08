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
    // 2026-06-16: size-conflict guard. The customer is billed THIS product's
    // price, so the SIZE must agree. A "size token" is one starting with a
    // digit ("6", "9", "19", '3/4"') — NOT "co2"/"kg"/"ltr". If both the query
    // and a candidate carry size tokens and none of them agree, skip that
    // candidate so we never bill e.g. a 9 kg price for a 6 kg unit. Such lines
    // then fall through to the unmatched list (surfaced) instead of mis-billing.
    const isSize = t => /^\d/.test(t);
    const qHasSize = qTokens.some(isSize);
    let best = null;
    for (const p of services) {
      const n = norm(p.nafn);
      // Skip hleðsla/yfirferð — those go through the main matcher.
      if (/hledsla|yfirferd/.test(n)) continue;
      const nTokens = n.split(' ').filter(Boolean);
      let matched = 0;
      let strongMatches = 0;
      let sizeAgrees = false;
      for (const q of qTokens) {
        if (nTokens.some(nt => tokenMatches(q, nt))) {
          matched++;
          // 2026-05-19: lowered from >=4 to >=3 so "co2" qualifies as a
          // strong token. Was rejecting all CO2 matches because the token
          // is only 3 chars long.
          if (q.length >= 3) strongMatches++;
          if (isSize(q)) sizeAgrees = true;
        }
      }
      if (strongMatches === 0) continue;
      const pHasSize = nTokens.some(isSize);
      if (qHasSize && pHasSize && !sizeAgrees) continue; // size conflict → don't mis-bill
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
    // 2026-06: read the stable data-co-id stamped on the company-detail action bar
    // (features.js) FIRST. Scraping a button onclick alone could match a leftover
    // button from a previously-open company → reports/uploads filed under the WRONG
    // fyrirtæki (mis-filed úttektarskýrslur bug, e.g. the 3 Heimaleiga lookalikes).
    const idEl = main.querySelector('[data-co-id]:not(._cat-section)');
    if (idEl) { const v = idEl.getAttribute('data-co-id'); if (v && /^\d+$/.test(v)) return +v; }
    const editBtn = main.querySelector('button._co-edit-anchor[onclick*="Companies.openEdit"]') || main.querySelector('button[onclick*="Companies.openEdit"]');
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

  // 2026-06-09: shared accessor for the custom inspection date so patches 165
  // (invoice) and 168 (úttektarskýrsla) build the exact same "Framkvæmd í Maí
  // 2026" phrase + exact date from the per-company trip state.
  window.SlokkVisitDate = {
    get(coId) {
      let st = {};
      try { st = JSON.parse(localStorage.getItem('slokk_trip_' + coId) || '{}'); }
      catch (_) {}
      const manudur = String(st.skodun_manudur || '').trim();
      const dags    = String(st.skodun_dagsetning || '').trim();
      // Year for the phrase: from the typed date if it carries one, else now.
      const ym = dags.match(/(\d{4})/);
      const year = ym ? ym[1] : String(new Date().getFullYear());
      const phrase = manudur ? ('Framkvæmd í ' + manudur + ' ' + year) : '';
      // 2026-06-10: optional free-text invoice line ("Vegna…"). Kept separate
      // from `phrase` so the úttektarskýrsla keeps its Framkvæmd-í-… wording.
      const invoice_text = String(st.invoice_text || '').trim();
      return { manudur, dags, year, phrase, invoice_text };
    }
  };

  function tripStateKey(coId) { return 'slokk_trip_' + coId; }
  function loadTripState(coId) {
    try { return JSON.parse(localStorage.getItem(tripStateKey(coId)) || '{}'); }
    catch (_) { return {}; }
  }
  function saveTripState(coId, state) {
    try { localStorage.setItem(tripStateKey(coId), JSON.stringify(state)); } catch (_) {}
  }
  function getUnitChoice(coId, unitId, typeText) {
    if (window.UnitServicePicker && window.UnitServicePicker.getChoice) {
      return window.UnitServicePicker.getChoice(coId, unitId, typeText);
    }
    const st = loadTripState(coId);
    if (st.units && st.units[unitId]) return st.units[unitId];
    const t = String(typeText || '').toLowerCase();
    if (/\bduft\b|\babc\b|\bpfc\b/.test(t)) return 'hledsla';
    return 'yfirferd';
  }

  async function fetchUnits(client) {
    const sb = window.DB && window.DB.sb;
    if (!sb) return [];
    let all = [];
    let from = 0, pageSize = 1000;
    while (true) {
      const { data, error } = await sb.from('uttaeki')
        .select('id,serial,type,size,status')
        .eq('client', client)
        .range(from, from + pageSize - 1);
      if (error || !data) break;
      all = all.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    // 2026-06-16: bill the SAME units the company-detail table shows. Was a
    // server-side .eq('status','active'), which silently dropped any unit
    // whose RAW status wasn't exactly 'active' — e.g. 'fail' (Bilað, patch 90),
    // 'ok', or null — even though Companies._normStatus renders them as
    // "✓ Virkt" and the user sets Hleðsla/Yfirferð on them. That caused
    // "3 tæki í skrá en 2 í kostnaði". Only onytt/geymsla/úrelt/í-vinnslu fall
    // out of the bill (still excludes the in-workshop unit per the old IKEA
    // 72→71 fix); the per-unit Sleppa/Ónýtt choice handles the rest.
    const NONBILL = { onytt: 1, geymsla: 1, urelt: 1, i_vinnslu: 1 };
    const normSt = (window.Companies && Companies._normStatus) ? Companies._normStatus : function (s) {
      const c = String(s == null ? '' : s).toLowerCase();
      if (c === 'onytt' || c === 'ónýtt') return 'onytt';
      if (/geymsl/.test(c)) return 'geymsla';
      if (c === 'urelt' || c === 'úrelt') return 'urelt';
      if (/vinnsl/.test(c)) return 'i_vinnslu';
      return 'active';
    };
    return all.filter(u => !NONBILL[normSt(u.status)]);
  }

  let _lastKey = '';
  let _rendering = false;
  let _lastRender = 0;

  async function render() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    // Don't re-render while the user is typing in a green trip-note field — a
    // rebuild would wipe in-progress text ("dettur út"). The field's own input
    // listener keeps tripState current; render runs again once they blur.
    const _ae = document.activeElement;
    if (_ae && /^_ctc-(notes-ta|athskyrsla|skodun|manudur|dags|invtext)$/.test(_ae.id || '')) return;
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
    const driveQty       = (tripState.driveQty   != null) ? Math.max(0, Number(tripState.driveQty)) : 1;
    const skyrslugerdEx  = (tripState.skyrslugerd != null) ? Number(tripState.skyrslugerd) : 3500;
    // 2026-06: afsláttur (%) á heildina — dregst af án-vsk og vsk hlutfallslega.
    const discountPct    = (tripState.discount_pct != null) ? Math.max(0, Math.min(100, Number(tripState.discount_pct) || 0)) : 0;
    // 2026-05-21: manual line items added via "+ Bæta við vöru eða þjónustu".
    // Each: {id, name, qty, unit_price_ex_vat, vsk_pct, vorur_id?, disc_pct?}.
    const extras = Array.isArray(tripState.extras) ? tripState.extras : [];
    // 2026-07-08: afsláttur (%) á HVERN lið (ósk Agnars). Geymt í trip-state:
    // þjónustulínur í line_disc (lykill 'svc|<tegund>|<stærð>|<kind>'), extras
    // á extra-hlutnum sjálfum (disc_pct). Per-stk verðið sýnist ÓBREYTT; línu-
    // samtalan = fjöldi × round(verð × (1−afsl%)) — sama stærðfræði og reikningurinn
    // (165 scrapeCostRows/buildLinur) notar svo tölurnar stemma alls staðar.
    const lineDisc = (tripState.line_disc && typeof tripState.line_disc === 'object') ? tripState.line_disc : {};
    const clampPct = v => Math.max(0, Math.min(100, parseFloat(String(v == null ? '' : v).replace(',', '.')) || 0));
    const discFor = key => clampPct(lineDisc[key]);
    const discUnitOf = (unitPrice, d) => Math.round(unitPrice * (1 - d / 100));
    // Afsl.-reitur í línu (autt = enginn afsláttur).
    const discCell = (key, d) =>
      '<td style="padding:7px 6px;text-align:center;white-space:nowrap">' +
        '<input class="_ctc-line-disc" data-lk="' + esc(key) + '" type="number" min="0" max="100" step="1" inputmode="numeric" value="' + (d > 0 ? d : '') + '" placeholder="0" ' +
        'style="width:44px;padding:3px 5px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;text-align:right;background:#fff;-moz-appearance:textfield"><span style="font-size:11px;color:#94a3b8">%</span>' +
      '</td>';

    // Aggregate by type+size, AND split count by chosen kind.
    // 2026-05-19: normalize type-family so "ABC Duft", "PFC Duft", and "Duft"
    // all bucket together — they are billed identically (the brand prefix is
    // just a label, the service price is the same Hleðsla/Yfirferð Duft).
    // Same for CO₂ vs "CO2", Léttvatn vs "ABF Léttvatn", etc.
    const agg = {};
    units.forEach(u => {
      const typeNorm = normalizeTypeFamily(u.type);
      const key = typeNorm + '|' + (u.size || '');
      if (!agg[key]) agg[key] = { key, type: typeNorm, size: u.size || '', hledsla: 0, yfirferd: 0, nyitt: 0, skip: 0 };
      const choice = getUnitChoice(coId, u.id, u.type);
      if (choice === 'hledsla') agg[key].hledsla++;
      else if (choice === 'yfirferd') agg[key].yfirferd++;
      else if (choice === 'nyitt') agg[key].nyitt++;
      else agg[key].skip++;
    });
    const groups = Object.values(agg)
      .filter(g => g.hledsla + g.yfirferd + g.nyitt + g.skip > 0)
      .sort((a, b) => (b.hledsla + b.yfirferd + b.nyitt) - (a.hledsla + a.yfirferd + a.nyitt));

    // 2026-05-20: blue notes box above the green cost section — free-text
    // for the visit (e.g. "Bára vill skipta öllum á neðri hæð"). Persisted in
    // the trip-state localStorage so it survives reload.
    let notesBox = main.querySelector('#_ctc-notes');
    if (!notesBox) {
      notesBox = document.createElement('div');
      notesBox.id = '_ctc-notes';
      // 2026-06-12 (Todoist): notes-boxið og Heildarkostnaður runnu áður sem
      // tvö aðskilin spjöld — nú efri helmingur af EINU samfelldu spjaldi
      // (engin neðri brún/radius hér; section tekur við fyrir neðan).
      notesBox.style.cssText =
        'margin:22px 0 0;padding:12px 16px 10px;background:var(--bg);border:1px solid var(--brd);border-bottom:none;border-radius:12px 12px 0 0;box-shadow:0 1px 3px rgba(0,0,0,.04)';
      // Insert before the existing cost section if it already exists, so the
      // notes box always appears ABOVE Heildarkostnaður. Guard: patch 224 may
      // have relocated #_ctc-section into the right-column slot (#_ctc-slot), so
      // it's no longer a direct child of main — insertBefore would THROW
      // (NotFoundError) and abort render() before the total is set. Only use it
      // when the section really is a child of main; otherwise append.
      const existingSection = main.querySelector('#_ctc-section');
      if (existingSection && existingSection.parentNode === main) main.insertBefore(notesBox, existingSection);
      else main.appendChild(notesBox);
    }
    const tripNotes = (tripState.notes != null) ? String(tripState.notes) : '';
    const athSkyrslaBox = (tripState.athugasemdir_skyrsla != null) ? String(tripState.athugasemdir_skyrsla) : '';
    notesBox.innerHTML =
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">' +
        '<div style="font-size:12.5px;color:var(--ink2);font-weight:700;text-transform:uppercase;letter-spacing:.05em">📝 Upplýsingar um úttekt</div>' +
      '</div>' +
      '<textarea id="_ctc-notes-ta" rows="4" placeholder="t.d. „Bára vill skipta öllum á neðri hæð" · „Hringja í Jón fyrir komu" · „Setja inn nýtt 6 kg ABC Duft"" ' +
        'style="width:100%;padding:8px 10px;border:1px solid var(--brd);border-radius:7px;font:inherit;font-size:13px;line-height:1.45;resize:vertical;box-sizing:border-box;background:#fff;color:#0f172a;min-height:92px">' +
        esc(tripNotes) +
      '</textarea>' +
      // 2026-06-10: report-only Athugasemdir, grouped here with the notes.
      '<div style="font-size:12px;color:var(--ink2);font-weight:600;margin:8px 0 3px">✍ Athugasemdir á skýrslu <span style="font-weight:400;color:var(--ink3)">(sést í „Athugasemdir" á úttektarskýrslunni, ekki á reikningnum)</span></div>' +
      '<textarea id="_ctc-athskyrsla" rows="2" placeholder="t.d. Mælt með að skipta út 2 tækjum á næsta ári" ' +
        'style="width:100%;padding:8px 10px;border:1px solid var(--brd);border-radius:7px;font:inherit;font-size:13px;line-height:1.45;resize:vertical;box-sizing:border-box;background:#fff;color:#0f172a">' +
        esc(athSkyrslaBox) +
      '</textarea>';

    let section = main.querySelector('#_ctc-section');
    if (!section) {
      section = document.createElement('div');
      section.id = '_ctc-section';
      // Neðri helmingur sama spjalds og _ctc-notes — dashed lína skilur að.
      section.style.cssText =
        'margin:0 0 26px;padding:14px 18px 18px;background:var(--bg);border:1px solid var(--brd);border-top:1px dashed #bbf7d0;border-radius:0 0 12px 12px;box-shadow:0 1px 3px rgba(0,0,0,.04)';
      main.appendChild(section);
    }

    if (!groups.length) {
      section.innerHTML = '<div style="font-size:13px;color:var(--ink2);font-weight:700">💵 Heildarkostnaður næstu þjónustu</div>' +
        '<div style="padding:14px 0;color:#94a3b8;font-style:italic">Engin skráð tæki — kostnaður er 0 kr.</div>';
      return;
    }

    let totalSubEx = 0;
    let totalVsk = 0;
    let unmatched = [];
    const rows = [];

    // Sizeless service families (Brunaslanga, Reykskynjari, Eldvarnateppi…) have
    // a single "Yfirferð X" service with NO size. Matching with the unit's size
    // (e.g. "30 m") dilutes the token score below the 0.5 threshold, so the unit
    // wrongly falls through to the new-unit (Vara) price — i.e. it bills as a
    // brand-new tæki. Drop the size for these when looking up the service price.
    // 2026-06-22: Léttvatn / Froða / ABF are single-price in the verðlista — there
    // is ONE "Léttvatnstæki yfirferð/hleðsla" (no per-size variant), so a unit size
    // like "6-9 ltr" must NOT dilute the token-match below the 0.5 threshold (it was
    // landing on "⚠ Engin matchandi þjónusta"). Treat them as sizeless like Brunaslanga.
    const SIZELESS_SVC = /léttv|lettv|abf|froð|frod|brunaslang|brunaslöng|brunaslong|hose|reykskynj|hitaskynj|smoke|teppi|blanket/i;
    groups.forEach(g => {
      const matchSize = SIZELESS_SVC.test(g.type) ? '' : g.size;
      const matching = findMatchingServices(g.type, matchSize, services);
      if (!matching.length && (g.hledsla > 0 || g.yfirferd > 0)) {
        // Fallback: try replacement product (Eldvarnateppi, Reykskynjari etc.)
        const replacement = findReplacementProduct(g.type, g.size, services);
        if (replacement) {
          const override = findOverride(coId, replacement.nafn);
          const unitPrice = override ? +override.price_ex_vat : +replacement.verd_an_vsk;
          const vskPct = override ? (+override.vsk_pct || 24) : (+replacement.vsk_prosenta || 24);
          const total = g.hledsla + g.yfirferd;
          const dKey = 'svc|' + g.type + '|' + g.size + '|vara';
          const dPct = discFor(dKey);
          const subEx = discUnitOf(unitPrice, dPct) * total;
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
            discCell(dKey, dPct) +
            '<td style="padding:7px 10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">' + fmtKr(subEx) + (dPct > 0 ? '<div style="font-size:10px;color:#b91c1c;font-weight:600">−' + dPct + '%</div>' : '') + '</td>' +
          '</tr>');
          return;
        }
        unmatched.push(g);
        rows.push('<tr><td style="padding:7px 10px;font-size:13px;color:#0f172a">' + esc(g.type) + ' / ' + esc(g.size) + '</td>' +
          '<td colspan="6" style="padding:7px 10px;color:#dc2626;font-size:12px;font-style:italic">⚠ Engin matchandi þjónusta í verðlista</td></tr>');
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
        const dKey = 'svc|' + g.type + '|' + g.size + '|' + kindKey;
        const dPct = discFor(dKey);
        const subEx = discUnitOf(unitPrice, dPct) * n;
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
          discCell(dKey, dPct) +
          '<td style="padding:7px 10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">' + fmtKr(subEx) + (dPct > 0 ? '<div style="font-size:10px;color:#b91c1c;font-weight:600">−' + dPct + '%</div>' : '') + '</td>' +
        '</tr>');
      });
      // 2026-05-20: "Nýtt" row — bill the store price of a brand-new unit.
      // Uses findReplacementProduct (same matcher used for Eldvarnateppi etc.)
      // which looks for non-hleðsla/yfirferð products by type+size tokens.
      if (g.nyitt > 0) {
        const newProduct = findReplacementProduct(g.type, g.size, services);
        if (newProduct) {
          const override = findOverride(coId, newProduct.nafn);
          const unitPrice = override ? +override.price_ex_vat : +newProduct.verd_an_vsk;
          const vskPct = override ? (+override.vsk_pct || 24) : (+newProduct.vsk_prosenta || 24);
          const dKey = 'svc|' + g.type + '|' + g.size + '|nyitt';
          const dPct = discFor(dKey);
          const subEx = discUnitOf(unitPrice, dPct) * g.nyitt;
          const vskKr = subEx * (vskPct / 100);
          totalSubEx += subEx;
          totalVsk += vskKr;
          rows.push('<tr>' +
            '<td style="padding:7px 10px;font-size:13px;color:#0f172a">' + esc(g.type) + ' / ' + esc(g.size) +
              '<div style="font-size:11px;color:#64748b">' + esc(newProduct.nafn) + '</div></td>' +
            '<td style="padding:7px 10px;text-align:center;font-weight:600;font-variant-numeric:tabular-nums">' + g.nyitt + '</td>' +
            '<td style="padding:7px 10px"><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#f3e8ff;color:#6b21a8">Nýtt</span></td>' +
            '<td style="padding:7px 10px;text-align:right;font-variant-numeric:tabular-nums">' + fmtKr(unitPrice) +
              (override ? ' <span title="' + esc(override.notes || '') + '" style="margin-left:4px;padding:1px 5px;background:#fef9c3;color:#854d0e;border:1px solid #fde047;border-radius:99px;font-size:9px;font-weight:700">💰</span>' : '') + '</td>' +
            '<td style="padding:7px 10px;text-align:center;font-size:12px;color:#475569">' + vskPct + '%</td>' +
            discCell(dKey, dPct) +
            '<td style="padding:7px 10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">' + fmtKr(subEx) + (dPct > 0 ? '<div style="font-size:10px;color:#b91c1c;font-weight:600">−' + dPct + '%</div>' : '') + '</td>' +
          '</tr>');
        } else {
          rows.push('<tr><td style="padding:7px 10px;font-size:13px;color:#0f172a">' + esc(g.type) + ' / ' + esc(g.size) + '</td>' +
            '<td style="padding:7px 10px;text-align:center;font-weight:600">' + g.nyitt + '</td>' +
            '<td style="padding:7px 10px"><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#f3e8ff;color:#6b21a8">Nýtt</span></td>' +
            '<td colspan="4" style="padding:7px 10px;color:#dc2626;font-size:12px;font-style:italic">⚠ Engin matchandi vara í verðlista — bæta við í Vörur og þjónusta</td></tr>');
        }
      }
      if (g.skip > 0) {
        rows.push('<tr style="opacity:.55">' +
          '<td style="padding:5px 10px;font-size:12px;color:#94a3b8">' + esc(g.type) + ' / ' + esc(g.size) + '</td>' +
          '<td style="padding:5px 10px;text-align:center;font-size:12px;color:#94a3b8">' + g.skip + '</td>' +
          '<td style="padding:5px 10px"><span style="padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;background:#f1f5f9;color:#64748b">Sleppt</span></td>' +
          '<td colspan="4" style="padding:5px 10px;color:#94a3b8;font-size:11px;font-style:italic">(Ekki í þessari ferð)</td>' +
        '</tr>');
      }
    });

    // 2026-05-21: Manual extras rows — rendered above Skýrslugerð/Akstur.
    // Each has inline editable qty + price + a ✕ remove button. Total
    // contributes to subEx/vsk so the SAMTALS at the bottom stays accurate.
    extras.forEach((ex, exIdx) => {
      const exQty   = Math.max(0, Number(ex.qty) || 0);
      const exPrice = Math.max(0, Number(ex.unit_price_ex_vat) || 0);
      const exVskPct = Number(ex.vsk_pct) || 24;
      const exDisc  = clampPct(ex.disc_pct);
      const exSubEx = exQty * discUnitOf(exPrice, exDisc);
      const exVskKr = exSubEx * (exVskPct / 100);
      totalSubEx += exSubEx;
      totalVsk += exVskKr;
      rows.push('<tr style="border-top:1px dashed #bfdbfe;background:#eff6ff">' +
        '<td colspan="2" style="padding:7px 10px;font-size:13px;color:#0f172a">📦 ' + esc(ex.name) + '</td>' +
        '<td style="padding:7px 10px;text-align:center">' +
          '<input class="_ctc-extra-qty" data-i="' + exIdx + '" type="number" min="0" step="1" value="' + exQty + '" ' +
          'style="width:54px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;text-align:center;background:#fff;font-variant-numeric:tabular-nums;font-weight:700">' +
        '</td>' +
        '<td style="padding:7px 10px;text-align:right">' +
          '<input class="_ctc-extra-price" data-i="' + exIdx + '" type="number" min="0" step="1" value="' + Math.round(exPrice) + '" ' +
          'style="width:90px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;text-align:right;background:#fff;font-variant-numeric:tabular-nums"> kr' +
        '</td>' +
        '<td style="padding:7px 10px;text-align:center;font-size:12px;color:#475569">' + exVskPct + '%</td>' +
        '<td style="padding:7px 6px;text-align:center;white-space:nowrap">' +
          '<input class="_ctc-extra-disc" data-i="' + exIdx + '" type="number" min="0" max="100" step="1" inputmode="numeric" value="' + (exDisc > 0 ? exDisc : '') + '" placeholder="0" ' +
          'style="width:44px;padding:3px 5px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;text-align:right;background:#fff"><span style="font-size:11px;color:#94a3b8">%</span>' +
        '</td>' +
        '<td style="padding:7px 10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap">' + fmtKr(exSubEx) +
          ' <button class="_ctc-extra-rm" data-i="' + exIdx + '" type="button" title="Eyða línu" ' +
          'style="margin-left:6px;background:none;border:none;color:#94a3b8;cursor:pointer;font-size:15px;line-height:1;padding:0 2px;vertical-align:middle">×</button>' +
        '</td>' +
      '</tr>');
    });

    // Skýrslugerð + Akstur eru EKKI lengur línur í töflunni — þær eru færðar niður
    // í heildartölu-blokkina sem flex-raðir (reitirnir línast þá upp við Afslátt).
    // Reikningurinn sjálfur (patch 165) bætir þeim við úr trip-state, ekki töflunni.
    totalSubEx += skyrslugerdEx;
    totalVsk += skyrslugerdEx * 0.24;

    const driveSubEx = driveCost * driveQty;
    totalSubEx += driveSubEx;
    totalVsk += driveSubEx * 0.24;

    // Afsláttur dreginn hlutfallslega af án-vsk og vsk (totalSubEx/totalVsk eru
    // brúttó; netto fer í VSK-línu + SAMTALS).
    const discountEx = totalSubEx * (discountPct / 100);
    const netSubEx   = totalSubEx - discountEx;
    const netVsk     = totalVsk * (1 - discountPct / 100);
    const totalInc   = netSubEx + netVsk;
    const activeUnits = units.length - groups.reduce((s, g) => s + g.skip, 0);

    const skodunaradili = (tripState.skodunaradili != null) ? String(tripState.skodunaradili) : '';
    // 2026-06-09: custom inspection date — Agnar wants to bill/report for the
    // actual month the visit happened, not "today". Two free-text fields:
    //   • skodun_manudur  — month label (e.g. "Maí") → "Framkvæmd í Maí 2026"
    //   • skodun_dagsetning — exact date (e.g. "09.06.2026") → invoice right
    //     side "Dagsetning:" + the úttektarskýrsla "yfirfarin" line.
    const skodunManudur = (tripState.skodun_manudur != null) ? String(tripState.skodun_manudur) : '';
    const skodunDags    = (tripState.skodun_dagsetning != null) ? String(tripState.skodun_dagsetning) : '';
    // 2026-06-10: free-text line that prints on the reikningur (the "Vegna…"
    // line), e.g. "Vinna vegna skoðunar á Dalvegi 10". Overrides the default.
    const invoiceText   = (tripState.invoice_text != null) ? String(tripState.invoice_text) : '';
    const _td = new Date();
    const todayDDMM = String(_td.getDate()).padStart(2, '0') + '.' +
      String(_td.getMonth() + 1).padStart(2, '0') + '.' + _td.getFullYear();
    section.innerHTML =
      '<div style="background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%);color:#fff;border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 6px 16px -10px rgba(0,0,0,.6)">' +
        '<div style="font-size:13px;font-weight:800;letter-spacing:.06em;display:flex;align-items:center;gap:7px">🧾 REIKNINGUR</div>' +
        '<div style="font-size:11px;opacity:.78;font-weight:600">' + activeUnits + ' af ' + units.length + ' tæki í ferð</div>' +
      '</div>' +
      // 2026-05-20: Skoðunaraðili (inspector) input + Úttektarskýrsla button.
      // Persisted in tripState so the field stays filled across visits.
      // 2026-06-22: inspector fields as a 3-col grid (labels ABOVE inputs) so the
      // reitir línast upp — áður voru þetta inline-merki sem brotnuðu ósamræmt á
      // mjóa hægri-dálkinum ("boxes don't line up"). Takkar fá sína eigin röð.
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">' +
        '<label style="display:flex;flex-direction:column;gap:3px;font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em">🧑 Skoðunaraðili' +
          '<input id="_ctc-skodun" type="text" value="' + esc(skodunaradili) + '" placeholder="t.d. Elías" ' +
            'style="width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid var(--brd);border-radius:7px;font:inherit;font-size:13px;font-weight:400;text-transform:none;letter-spacing:normal;color:#0f172a;background:#fff">' +
        '</label>' +
        '<label style="display:flex;flex-direction:column;gap:3px;font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em">📅 Framkvæmd' +
          '<input id="_ctc-manudur" type="text" value="' + esc(skodunManudur) + '" placeholder="t.d. Maí" ' +
            'style="width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid var(--brd);border-radius:7px;font:inherit;font-size:13px;font-weight:400;text-transform:none;letter-spacing:normal;color:#0f172a;background:#fff">' +
        '</label>' +
        '<label style="display:flex;flex-direction:column;gap:3px;font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em">Dags.' +
          '<input id="_ctc-dags" type="text" value="' + esc(skodunDags) + '" placeholder="' + esc(todayDDMM) + '" ' +
            'style="width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid var(--brd);border-radius:7px;font:inherit;font-size:13px;font-weight:400;text-transform:none;letter-spacing:normal;color:#0f172a;background:#fff">' +
        '</label>' +
      '</div>' +
      // 2026-06-22: skipa takkana eins og á mockup-inu — stóri græni Úttektar-
      // skýrslu-takkinn LEFT (flex:1), Vista óklárað RIGHT (flex:0 0 auto, mjór).
      '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">' +
        '<button id="_ctc-skyrsla" type="button" ' +
          'style="flex:1;min-width:180px;padding:8px 14px;background:linear-gradient(145deg,#093a20 0%,#16613a 30%,#1f7a48 52%,#0d4226 76%,#062815 100%);color:#fff;border:1px solid #0a3a20;border-radius:7px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 1px 2px rgba(0,0,0,.25)">' +
          '📄 Búa til úttektarskýrslu</button>' +
        '<button id="_ctc-vista" type="button" title="Vista óklárað — opnast sjálfkrafa næst, líka í síma" ' +
          'style="flex:0 0 auto;padding:8px 14px;background:#fff;color:var(--ink1);border:1px solid var(--brd);border-radius:7px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">' +
          '💾 Vista óklárað</button>' +
      '</div>' +
      // 2026-06-10: free-text line printed on the reikningur.
      '<div style="margin-bottom:10px">' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#0f172a">' +
          '<span style="font-weight:600;color:var(--ink2);white-space:nowrap">🧾 Texti á reikning</span>' +
          '<input id="_ctc-invtext" type="text" value="' + esc(invoiceText) + '" placeholder="t.d. Vinna vegna skoðunar á Dalvegi 10" ' +
            'style="flex:1;min-width:120px;padding:6px 10px;border:1px solid var(--brd);border-radius:6px;font:inherit;font-size:13px;background:#fff">' +
        '</label>' +
        '<div style="font-size:10.5px;color:var(--ink3);margin-top:3px;margin-left:2px">Sést sem „Vegna…" lína á reikningnum (yfirskrifar sjálfgefið).</div>' +
      '</div>' +
      // 2026-05-21: "+ Bæta við vöru eða þjónustu" button opens the shared
      // VorurPicker (patch 117) and appends the choice to tripState.extras.
      '<div style="display:flex;justify-content:flex-end;margin-bottom:10px">' +
        '<button id="_ctc-add-extra" type="button" ' +
          'style="padding:6px 12px;background:#dbeafe;border:1px solid #93c5fd;color:#1e40af;border-radius:7px;font:inherit;font-size:12px;font-weight:700;cursor:pointer">' +
          '+ Bæta við vöru eða þjónustu</button>' +
      '</div>' +
      // Línur — láréttt skrunanlegt á mjóum skjá svo „Samtals"-dálkurinn klippist
      // aldrei af; heildartölurnar eru í fullbreiðu spjaldi fyrir neðan (sem
      // klippist aldrei — sjá #_ctc-sum-*).
      '<div style="background:#fff;border:1px solid var(--brd);border-bottom:none;border-radius:8px 8px 0 0;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch">' +
        '<table style="width:100%;border-collapse:collapse">' +
          '<thead style="background:var(--bg)"><tr>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.05em">Tegund / Stærð</th>' +
            '<th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.05em;width:60px">Fjöldi</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.05em;width:90px">Þjónusta</th>' +
            '<th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.05em">Per stk</th>' +
            '<th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.05em;width:50px">VSK</th>' +
            '<th style="padding:8px 6px;text-align:center;font-size:10px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.05em;width:56px">Afsl.</th>' +
            '<th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.05em">Samtals</th>' +
          '</tr></thead>' +
          '<tbody>' + rows.join('') + '</tbody>' +
        '</table>' +
      '</div>' +
      // Heildartölur — fullbreitt, alltaf sýnilegt (klippist ekki), texti vinstri / upphæð hægri.
      '<div style="background:#fff;border:1px solid var(--brd);border-top:none;border-radius:0 0 8px 8px;overflow:hidden">' +
        // Skýrslugerð — flex-röð svo reiturinn línist upp við Akstur + Afslátt.
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 12px;border-top:1px dashed var(--brd)">' +
          '<span style="font-size:12px;color:#475569">📋 Skýrslugerð</span>' +
          '<span style="display:flex;align-items:center;gap:5px;white-space:nowrap">' +
            '<input id="_ctc-skyrslu" type="number" min="0" step="1" value="' + Math.round(skyrslugerdEx) + '" placeholder="0" ' +
              'style="width:84px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;text-align:right;background:#fff;font-variant-numeric:tabular-nums">' +
            '<span style="font-size:12px;color:#475569">kr</span>' +
          '</span>' +
        '</div>' +
        // Akstur — fjöldi ferða × verð; báðir reitir hægra megin (línast upp).
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 12px">' +
          '<span style="font-size:12px;color:#475569">🚗 Akstur</span>' +
          '<span style="display:flex;align-items:center;gap:5px;white-space:nowrap">' +
            '<input id="_ctc-drive-qty" type="number" min="0" step="1" value="' + driveQty + '" title="Fjöldi ferða" ' +
              'style="width:42px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;text-align:center;background:#fff;font-variant-numeric:tabular-nums;font-weight:700">' +
            '<span style="font-size:12px;color:#94a3b8">×</span>' +
            '<input id="_ctc-drive" type="number" min="0" step="1" value="' + Math.round(driveCost) + '" placeholder="0" ' +
              'style="width:84px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;text-align:right;background:#fff;font-variant-numeric:tabular-nums">' +
            '<span style="font-size:12px;color:#475569">kr</span>' +
          '</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 12px;border-top:2px solid var(--ink2)">' +
          '<span style="font-size:12px;color:#475569">Án vsk</span>' +
          '<span id="_ctc-sum-subex" style="font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;font-family:\'Space Mono\',monospace">' + fmtKr(totalSubEx) + '</span>' +
        '</div>' +
        // Afsláttur (%) — alltaf sýnilegt svo hægt sé að slá inn; upphæð birtist þegar > 0.
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 12px">' +
          '<span style="font-size:12px;color:#475569">Afsláttur ' +
            '<input id="_ctc-discount" type="number" min="0" max="100" step="1" value="' + discountPct + '" ' +
            'style="width:48px;padding:3px 6px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;text-align:right;background:#fff;-moz-appearance:textfield"> %</span>' +
          '<span style="font-weight:600;color:#b91c1c;font-variant-numeric:tabular-nums;font-family:\'Space Mono\',monospace">' + (discountEx > 0 ? '−' + fmtKr(discountEx) : '—') + '</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 12px">' +
          '<span style="font-size:12px;color:#475569">VSK</span>' +
          '<span id="_ctc-sum-vsk" style="font-weight:600;color:#0f172a;font-variant-numeric:tabular-nums;font-family:\'Space Mono\',monospace">' + fmtKr(netVsk) + '</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:linear-gradient(110deg,#0c1018,#13203f 45%,#274a9e);color:#fff">' +
          '<span style="font-size:13px;font-weight:800;letter-spacing:.04em">SAMTALS M. VSK</span>' +
          '<span id="_ctc-sum-total" style="font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;font-family:\'Space Mono\',monospace;white-space:nowrap">' + fmtKr(totalInc) + '</span>' +
        '</div>' +
      '</div>' +
      (unmatched.length ? '<div style="margin-top:8px;padding:8px 10px;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;font-size:11px;color:#78350f">⚠ ' + unmatched.length + ' tegund(ir) fundu ekki matchandi þjónustu í verðlista. Bæta við í <b>Vörur og þjónusta</b>.</div>' : '');

    // Wire Skoðunaraðili input.
    const skodunInp = section.querySelector('#_ctc-skodun');
    if (skodunInp) {
      const onSkodun = () => {
        const st = loadTripState(coId);
        st.skodunaradili = skodunInp.value;
        saveTripState(coId, st);
      };
      skodunInp.addEventListener('input', onSkodun);
      skodunInp.addEventListener('blur', onSkodun);
      skodunInp.addEventListener('change', onSkodun);
    }
    // Wire Skoðun framkvæmd (month) + Dagsetning inputs.
    const manudurInp = section.querySelector('#_ctc-manudur');
    if (manudurInp) {
      const onManudur = () => {
        const st = loadTripState(coId);
        st.skodun_manudur = manudurInp.value;
        saveTripState(coId, st);
      };
      manudurInp.addEventListener('input', onManudur);
      manudurInp.addEventListener('blur', onManudur);
      manudurInp.addEventListener('change', onManudur);
    }
    const dagsInp = section.querySelector('#_ctc-dags');
    if (dagsInp) {
      const onDags = () => {
        const st = loadTripState(coId);
        st.skodun_dagsetning = dagsInp.value;
        saveTripState(coId, st);
      };
      dagsInp.addEventListener('input', onDags);
      dagsInp.addEventListener('blur', onDags);
      dagsInp.addEventListener('change', onDags);
    }
    // Wire report-Athugasemdir textarea.
    const athInp = notesBox.querySelector('#_ctc-athskyrsla');
    if (athInp) {
      const onAth = () => { const st = loadTripState(coId); st.athugasemdir_skyrsla = athInp.value; saveTripState(coId, st); };
      athInp.addEventListener('input', onAth);
      athInp.addEventListener('blur', onAth);
      athInp.addEventListener('change', onAth);
    }
    // Wire invoice-text input.
    const invTextInp = section.querySelector('#_ctc-invtext');
    if (invTextInp) {
      const onInv = () => { const st = loadTripState(coId); st.invoice_text = invTextInp.value; saveTripState(coId, st); };
      invTextInp.addEventListener('input', onInv);
      invTextInp.addEventListener('blur', onInv);
      invTextInp.addEventListener('change', onInv);
    }
    // Wire "💾 Vista óklárað" — the working state is already in localStorage
    // (saved on every edit); push it to the cloud now so it's safe + reopens on
    // any device. Patch 227 provides TripCloudSync.
    const vistaBtn = section.querySelector('#_ctc-vista');
    if (vistaBtn) {
      vistaBtn.addEventListener('click', () => {
        const p = (window.TripCloudSync && window.TripCloudSync.saveNow)
          ? window.TripCloudSync.saveNow(coId) : Promise.resolve(true);
        vistaBtn.disabled = true; vistaBtn.textContent = '⏳ Vista…';
        Promise.resolve(p).then(() => {
          vistaBtn.textContent = '✓ Vistað';
          if (window.Toast && Toast.show) Toast.show('💾 Óklárað vistað — opnast sjálfkrafa næst (líka í síma).');
          setTimeout(() => { vistaBtn.disabled = false; vistaBtn.textContent = '💾 Vista óklárað'; }, 1800);
        });
      });
    }
    // Wire úttektarskýrsla button → patch 168.
    const skyrsluBtn = section.querySelector('#_ctc-skyrsla');
    if (skyrsluBtn) {
      skyrsluBtn.addEventListener('click', () => {
        // Save inspector + custom date first so the report picks them up.
        if (skodunInp || manudurInp || dagsInp) {
          const st = loadTripState(coId);
          if (skodunInp)  st.skodunaradili     = skodunInp.value;
          if (manudurInp) st.skodun_manudur    = manudurInp.value;
          if (dagsInp)    st.skodun_dagsetning = dagsInp.value;
          saveTripState(coId, st);
        }
        if (window.CompanyInspectionReport && CompanyInspectionReport.open) {
          CompanyInspectionReport.open(coId);
        } else {
          alert('Úttektarskýrslu-mótið er ekki tiltækt.');
        }
      });
    }

    // Wire notes textarea — autosave on blur + change (debounced via blur).
    const notesTa = notesBox.querySelector('#_ctc-notes-ta');
    if (notesTa) {
      const onNotes = () => {
        const st = loadTripState(coId);
        st.notes = notesTa.value;
        saveTripState(coId, st);
      };
      notesTa.addEventListener('input', onNotes);
      notesTa.addEventListener('blur', onNotes);
      notesTa.addEventListener('change', onNotes);
    }

    // 2026-05-21: + Bæta við vöru eða þjónustu — opens VorurPicker, appends
    // the chosen product to tripState.extras with qty=1 + product's default
    // price + VSK%. The user can then edit qty/price inline.
    const addExtraBtn = section.querySelector('#_ctc-add-extra');
    if (addExtraBtn) {
      addExtraBtn.addEventListener('click', () => {
        if (!window.VorurPicker || typeof VorurPicker.open !== 'function') {
          alert('Vörulistinn er ekki tiltækur (patch 117).'); return;
        }
        VorurPicker.open(prod => {
          if (!prod) return;
          const st = loadTripState(coId);
          if (!Array.isArray(st.extras)) st.extras = [];
          st.extras.push({
            name: prod.nafn || 'Vara',
            qty: 1,
            unit_price_ex_vat: Number(prod.verd_an_vsk) || 0,
            vsk_pct: Number(prod.vsk_prosenta) || 24,
            vorur_id: prod.id || null
          });
          saveTripState(coId, st);
          _lastKey = '';
          render();
        });
      });
    }
    // Wire per-extra qty / price / remove controls.
    section.querySelectorAll('._ctc-extra-qty').forEach(inp => {
      const onChange = () => {
        const i = +inp.dataset.i;
        const v = Math.max(0, parseInt(inp.value, 10) || 0);
        const st = loadTripState(coId);
        if (Array.isArray(st.extras) && st.extras[i]) {
          st.extras[i].qty = v;
          saveTripState(coId, st);
        }
        _lastKey = '';
        render();
      };
      inp.addEventListener('change', onChange);
      inp.addEventListener('blur', onChange);
      inp.addEventListener('input', () => { const i = +inp.dataset.i; const st = loadTripState(coId); if (Array.isArray(st.extras) && st.extras[i]) { st.extras[i].qty = Math.max(0, parseInt(inp.value, 10) || 0); saveTripState(coId, st); } });
    });
    section.querySelectorAll('._ctc-extra-price').forEach(inp => {
      const onChange = () => {
        const i = +inp.dataset.i;
        const v = Math.max(0, parseFloat(inp.value) || 0);
        const st = loadTripState(coId);
        if (Array.isArray(st.extras) && st.extras[i]) {
          st.extras[i].unit_price_ex_vat = v;
          saveTripState(coId, st);
        }
        _lastKey = '';
        render();
      };
      inp.addEventListener('change', onChange);
      inp.addEventListener('blur', onChange);
      inp.addEventListener('input', () => { const i = +inp.dataset.i; const st = loadTripState(coId); if (Array.isArray(st.extras) && st.extras[i]) { st.extras[i].unit_price_ex_vat = Math.max(0, parseFloat(inp.value) || 0); saveTripState(coId, st); } });
    });
    section.querySelectorAll('._ctc-extra-rm').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.i;
        const st = loadTripState(coId);
        if (Array.isArray(st.extras) && st.extras[i]) {
          st.extras.splice(i, 1);
          saveTripState(coId, st);
        }
        _lastKey = '';
        render();
      });
    });

    // 2026-07-08: afsláttur (%) á hvern lið — þjónustulínur (line_disc) + extras (disc_pct).
    section.querySelectorAll("._ctc-line-disc").forEach(inp => {
      const persist = () => {
        const key = inp.dataset.lk;
        const v = Math.max(0, Math.min(100, parseFloat(String(inp.value).replace(",", ".")) || 0));
        const st = loadTripState(coId);
        if (!st.line_disc || typeof st.line_disc !== "object") st.line_disc = {};
        // 2026-07-08 (afsláttar-úttekt): 0 er geymt í stað þess að eyða
        // lyklinum — 227 deep-merge eyðir aldrei lyklum í skýinu, svo EYDDUR
        // afsláttur birtist aftur á hinu tækinu (og rukkaðist). 0 skrifast yfir.
        st.line_disc[key] = v > 0 ? v : 0;
        saveTripState(coId, st);
        return v;
      };
      const onChange = () => { persist(); _lastKey = ""; render(); };
      inp.addEventListener("change", onChange);
      inp.addEventListener("blur", onChange);
      inp.addEventListener("input", persist);
    });
    section.querySelectorAll("._ctc-extra-disc").forEach(inp => {
      const persist = () => {
        const i = +inp.dataset.i;
        const v = Math.max(0, Math.min(100, parseFloat(String(inp.value).replace(",", ".")) || 0));
        const st = loadTripState(coId);
        if (Array.isArray(st.extras) && st.extras[i]) { st.extras[i].disc_pct = v; saveTripState(coId, st); }
      };
      const onChange = () => { persist(); _lastKey = ""; render(); };
      inp.addEventListener("change", onChange);
      inp.addEventListener("blur", onChange);
      inp.addEventListener("input", persist);
    });

    // Wire driving input (per-trip price).
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
      // Per-keystroke save (no render → no cursor jump); total recomputes on blur.
      driveInp.addEventListener('input', () => { const st = loadTripState(coId); st.drive = parseFloat(driveInp.value) || 0; saveTripState(coId, st); });
    }
    // Wire driving quantity input (number of trips).
    const driveQtyInp = section.querySelector('#_ctc-drive-qty');
    if (driveQtyInp) {
      const onDriveQty = () => {
        const v = Math.max(0, parseInt(driveQtyInp.value, 10) || 0);
        const st = loadTripState(coId);
        st.driveQty = v;
        saveTripState(coId, st);
        _lastKey = '';
        render();
      };
      driveQtyInp.addEventListener('change', onDriveQty);
      driveQtyInp.addEventListener('blur', onDriveQty);
      driveQtyInp.addEventListener('input', () => { const st = loadTripState(coId); st.driveQty = Math.max(0, parseInt(driveQtyInp.value, 10) || 0); saveTripState(coId, st); });
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
      skyrsluInp.addEventListener('input', () => { const st = loadTripState(coId); st.skyrslugerd = parseFloat(skyrsluInp.value) || 0; saveTripState(coId, st); });
    }
    // Wire Afsláttur (%) input.
    const discInp = section.querySelector('#_ctc-discount');
    if (discInp) {
      const onDisc = () => {
        const v = Math.max(0, Math.min(100, Math.round(Number(discInp.value) || 0)));
        const st = loadTripState(coId);
        st.discount_pct = v;
        saveTripState(coId, st);
        _lastKey = '';
        render();
      };
      discInp.addEventListener('change', onDisc);
      discInp.addEventListener('blur', onDisc);
      discInp.addEventListener('input', () => { const st = loadTripState(coId); st.discount_pct = Math.max(0, Math.min(100, Math.round(Number(discInp.value) || 0))); saveTripState(coId, st); });
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

  console.log('[company-total-cost] v4 installed — duft now defaults to hleðsla');
})();
