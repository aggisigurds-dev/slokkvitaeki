/* === ADDRESS BACKFILL v1 ===
 *
 * Fyllir út vantar heimilisföng úr Fyrirtækjaskrá RSK (skatturinn.is) með
 * /api/kt-lookup. Eitt batch-tól: finnur línur í BÁÐUM töflum (`fyrirtaeki`
 * + `vidskiptavinir`) sem hafa 10-stafa kennitölu EN tómt `heimilisfang`,
 * forskoðar (dry-run) hvað RSK gefur fyrir hverja, og — eftir staðfestingu —
 * skrifar `heimilisfang = heimilisfang_full` á þær línur.
 *
 *   • Forskoðun fyrst: enginn skrif fyrr en notandi smellir „Staðfesta og vista".
 *   • Skrifar ALDREI yfir heimilisfang sem er þegar útfyllt (öryggi).
 *   • ~200ms bið milli uppfletta (mjúkt við RSK); 404/timeout per línu →
 *     sleppt + skráð („fannst ekki").
 *   • Lifandi framvinda + samantekt: „N fylltir · M fundust ekki".
 *
 * Uppfletting speglar netfangs-leiðina úr patch 19 (kennitala-lookup):
 *   1) Eigin Netlify Function /api/kt-lookup (ef deplýjuð)
 *   2) Public CORS-proxy → skatturinn.is, parsað client-side (sama regex).
 *
 * Tólið birtist sem hnappur í „🏢 Fyrirtæki · yfirferð" (patch 198) — þar sem
 * „Vantar heimili" sían er þegar til — og er líka aðgengilegt sem
 * window.AddressBackfill.open(). DB.sb.from(...).update(...) eins og annars
 * staðar í kóðanum. Aðeins `heimilisfang` er skrifað (hvorug taflan hefur
 * postnumer/stadur dálka — heimilisfang_full inniheldur póstnúmer+stað).
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__addressBackfillInstalled) return;
  window.__addressBackfillInstalled = true;

  const BTN_LABEL = '📍 Fylla út vantar heimilisföng (úr fyrirtækjaskrá)';
  const LOOKUP_DELAY_MS = 200; // mjúkt við RSK

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function digits(kt) { return String(kt == null ? '' : kt).replace(/[^0-9]/g, ''); }
  function fmtKt(kt) { const c = digits(kt); return c.length >= 10 ? c.slice(0, 6) + '-' + c.slice(6, 10) : c; }
  function isBlank(v) { return !v || !String(v).trim(); }

  // ── RSK lookup (mirrors patch 19) ─────────────────────────────────────────
  function parseRskHtml(html) {
    const nameMatch = html.match(/<h1>\s*([^<(]+?)\s*\((\d{10})\)\s*<\/h1>/);
    const nafn = nameMatch ? nameMatch[1].trim() : '';
    if (!nafn) return null;
    let heimilisfang = '', postnumer = '', stadur = '';
    const addrMatch = html.match(/<td>\s*([^<>]+?)\s*<br\s*\/?>\s*(\d{3})\s+([^<>]+?)\s*<\/td>/);
    if (addrMatch) {
      heimilisfang = addrMatch[1].trim();
      postnumer = addrMatch[2].trim();
      stadur = addrMatch[3].trim();
    }
    const heimilisfang_full = [heimilisfang, postnumer && stadur ? `${postnumer} ${stadur}` : (postnumer || stadur)]
      .filter(Boolean).join(', ');
    return { nafn, heimilisfang, heimilisfang_full, postnumer, stadur };
  }

  // Returns { nafn, heimilisfang_full } or null if the kt isn't in the registry.
  // Throws only on a hard network failure (no source reachable at all).
  async function lookupKt(kt) {
    const clean = digits(kt);
    if (clean.length !== 10) return null;

    // 1) Eigin Netlify Function.
    try {
      const r = await fetch(`/api/kt-lookup?kt=${clean}`);
      if (r.ok) {
        const d = await r.json();
        if (d && d.nafn) {
          return {
            nafn: d.nafn,
            heimilisfang_full: d.heimilisfang_full || d.heimilisfang || ''
          };
        }
      } else if (r.status === 404) {
        return null; // RSK said: ekki í fyrirtækjaskrá
      }
      // other status → fall through to proxies
    } catch (_) { /* fall through */ }

    // 2) Public CORS-proxar → skatturinn.is.
    const target = `https://www.skatturinn.is/fyrirtaekjaskra/leit/kennitala/${clean}`;
    const proxies = [
      'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(target),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(target),
      'https://corsproxy.io/?url=' + encodeURIComponent(target)
    ];
    let anyProxyReached = false;
    for (const url of proxies) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        anyProxyReached = true;
        const html = await r.text();
        const parsed = parseRskHtml(html);
        if (parsed) return { nafn: parsed.nafn, heimilisfang_full: parsed.heimilisfang_full || parsed.heimilisfang || '' };
        // proxy worked but kt not in fyrirtækjaskrá → not found
      } catch (_) { /* try next proxy */ }
    }
    if (!anyProxyReached) throw new Error('network');
    return null; // reached RSK but kt not found
  }

  // ── Collect candidate rows from both tables ───────────────────────────────
  // A candidate has a 10-digit kennitala AND a blank heimilisfang.
  async function collectCandidates() {
    const SB = getSB();
    if (!SB) throw new Error('Engin gagnabankatenging.');
    const out = [];

    const fr = await SB.from('fyrirtaeki')
      .select('id,nafn,kennitala,heimilisfang,deleted_at')
      .order('nafn');
    if (fr.error) throw fr.error;
    (fr.data || []).forEach(r => {
      if (r.deleted_at) return;
      if (digits(r.kennitala).length !== 10) return;
      if (!isBlank(r.heimilisfang)) return;
      out.push({ table: 'fyrirtaeki', id: r.id, nafn: r.nafn || '(nafnlaust)', kt: digits(r.kennitala) });
    });

    const vr = await SB.from('vidskiptavinir')
      .select('id,nafn,kennitala,heimilisfang,deleted_at')
      .order('nafn');
    if (vr.error) throw vr.error;
    (vr.data || []).forEach(r => {
      if (r.deleted_at) return;
      if (digits(r.kennitala).length !== 10) return;
      if (!isBlank(r.heimilisfang)) return;
      out.push({ table: 'vidskiptavinir', id: r.id, nafn: r.nafn || '(nafnlaust)', kt: digits(r.kennitala) });
    });

    return out;
  }

  // ── Modal scaffolding ─────────────────────────────────────────────────────
  let _backEl = null;
  function closeModal() { if (_backEl) { _backEl.remove(); _backEl = null; } }
  function openShell(innerHtml) {
    closeModal();
    const back = document.createElement('div');
    back.id = '_abf-back';
    back.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';
    back.innerHTML =
      '<div style="background:#fff;border-radius:14px;max-width:760px;width:100%;max-height:88vh;overflow:auto;padding:18px 22px;box-shadow:0 20px 50px rgba(0,0,0,.3)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px">' +
      '<h2 style="margin:0;font-size:17px;color:#0f172a;display:flex;align-items:center;gap:8px">📍 Vantar heimilisföng</h2>' +
      '<button id="_abf-x" type="button" style="background:none;border:none;cursor:pointer;font-size:22px;color:#64748b;line-height:1">×</button>' +
      '</div>' +
      '<div id="_abf-body">' + innerHtml + '</div>' +
      '</div>';
    document.body.appendChild(back);
    _backEl = back;
    back.addEventListener('click', e => { if (e.target === back) closeModal(); });
    back.querySelector('#_abf-x').addEventListener('click', closeModal);
    return back;
  }
  function setBody(html) { const b = document.getElementById('_abf-body'); if (b) b.innerHTML = html; }

  // ── Flow ──────────────────────────────────────────────────────────────────
  let _running = false;

  async function open() {
    if (_running) { toast('Uppfletting er þegar í gangi'); return; }
    if (!getSB()) { toast('Engin gagnabankatenging.'); return; }
    openShell('<div style="padding:24px 8px;text-align:center;color:#64748b">⏳ Leita að línum sem vantar heimilisfang…</div>');

    let cands;
    try {
      cands = await collectCandidates();
    } catch (e) {
      setBody('<div style="padding:20px 8px;color:#dc2626">Villa: ' + esc(e.message || e) + '</div>');
      return;
    }
    if (!cands.length) {
      setBody('<div style="padding:24px 8px;text-align:center;color:#16a34a">✓ Engin lína fannst með kennitölu en tómt heimilisfang. Allt í lagi.</div>');
      return;
    }
    renderPreviewStart(cands);
  }

  function tableCounts(cands) {
    const f = cands.filter(c => c.table === 'fyrirtaeki').length;
    const v = cands.filter(c => c.table === 'vidskiptavinir').length;
    return { f, v };
  }

  // Step 1: dry-run — look up each kt, build the proposed list, then ask to confirm.
  async function renderPreviewStart(cands) {
    const { f, v } = tableCounts(cands);
    setBody(
      '<div style="font-size:12.5px;color:#475569;margin-bottom:12px">' +
      'Fann <strong>' + cands.length + '</strong> línur með kennitölu en tómt heimilisfang ' +
      '(' + f + ' fyrirtæki · ' + v + ' viðskiptavinir). ' +
      'Sæki tillögur úr Fyrirtækjaskrá RSK — ekkert er vistað í þessu skrefi.' +
      '</div>' +
      '<div id="_abf-prog" style="font-size:12px;color:#64748b;margin-bottom:8px">Sæki… 0 / ' + cands.length + '</div>' +
      '<div id="_abf-list" style="display:flex;flex-direction:column;gap:5px;max-height:46vh;overflow:auto"></div>' +
      '<div id="_abf-foot" style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end"></div>'
    );

    _running = true;
    const proposals = []; // { table,id,nafn,kt,heimilisfang_full }
    const notFound = [];  // { nafn, kt }
    let netError = false;
    const listEl = document.getElementById('_abf-list');
    const progEl = document.getElementById('_abf-prog');

    for (let i = 0; i < cands.length; i++) {
      if (!_backEl) { _running = false; return; } // modal closed → abort
      const c = cands[i];
      let res = null;
      try {
        res = await lookupKt(c.kt);
      } catch (e) {
        netError = true; // hard network failure
      }
      if (res && res.heimilisfang_full) {
        proposals.push({ table: c.table, id: c.id, nafn: c.nafn, kt: c.kt, heimilisfang_full: res.heimilisfang_full });
        if (listEl) {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;gap:10px;padding:7px 11px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px';
          row.innerHTML =
            '<div style="min-width:0;flex:1">' +
            '<div style="font-weight:700;color:#0f172a;font-size:12.5px">' + esc(c.nafn) +
            ' <span style="font-size:10.5px;color:#94a3b8;font-family:monospace">' + esc(fmtKt(c.kt)) + '</span>' +
            ' <span style="font-size:10px;color:#94a3b8">· ' + (c.table === 'fyrirtaeki' ? 'fyrirtæki' : 'viðskiptav.') + '</span></div>' +
            '<div style="font-size:12px;color:#166534;margin-top:2px">→ ' + esc(res.heimilisfang_full) + '</div>' +
            '</div>';
          listEl.appendChild(row);
        }
      } else {
        notFound.push({ nafn: c.nafn, kt: c.kt });
      }
      if (progEl) progEl.textContent = 'Sæki… ' + (i + 1) + ' / ' + cands.length +
        '  (✓ ' + proposals.length + ' · ✗ ' + notFound.length + ')';
      if (i < cands.length - 1) await sleep(LOOKUP_DELAY_MS);
    }

    _running = false;
    if (!_backEl) return;

    if (progEl) {
      progEl.innerHTML = '<strong>Tilbúið að vista ' + proposals.length + '</strong> heimilisföng' +
        (notFound.length ? ' · ' + notFound.length + ' fundust ekki í fyrirtækjaskrá' : '') +
        (netError ? ' · <span style="color:#b45309">⚠️ einhverjar uppflettingar mistókust (net)</span>' : '');
    }
    if (notFound.length && listEl) {
      const sep = document.createElement('div');
      sep.style.cssText = 'font-size:10.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;font-weight:700;padding:8px 2px 2px';
      sep.textContent = 'Fundust ekki (' + notFound.length + ')';
      listEl.appendChild(sep);
      notFound.forEach(n => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;gap:10px;padding:6px 11px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px';
        row.innerHTML = '<div style="font-size:12px;color:#991b1b">' + esc(n.nafn) +
          ' <span style="font-family:monospace;font-size:10.5px;color:#b91c1c">' + esc(fmtKt(n.kt)) + '</span></div>';
        listEl.appendChild(row);
      });
    }

    const foot = document.getElementById('_abf-foot');
    if (foot) {
      foot.innerHTML =
        '<button id="_abf-cancel" type="button" style="padding:8px 14px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;color:#334155">Hætta við</button>' +
        '<button id="_abf-go" type="button"' + (proposals.length ? '' : ' disabled') +
        ' style="padding:8px 16px;background:' + (proposals.length ? '#16a34a' : '#94a3b8') + ';color:#fff;border:none;border-radius:8px;cursor:' + (proposals.length ? 'pointer' : 'default') + ';font:inherit;font-size:13px;font-weight:700">' +
        'Staðfesta og vista ' + proposals.length + '</button>';
      const cancel = document.getElementById('_abf-cancel');
      if (cancel) cancel.onclick = closeModal;
      const go = document.getElementById('_abf-go');
      if (go && proposals.length) go.onclick = () => writeAll(proposals);
    }
  }

  // Step 2: write — update each row's heimilisfang. Re-checks each row is STILL
  // blank right before writing so we never overwrite a non-empty address.
  async function writeAll(proposals) {
    const SB = getSB();
    if (!SB) { toast('Engin gagnabankatenging.'); return; }
    _running = true;
    setBody(
      '<div id="_abf-wprog" style="font-size:13px;color:#0f172a;margin-bottom:10px">Vista… 0 / ' + proposals.length + '</div>' +
      '<div id="_abf-wlist" style="display:flex;flex-direction:column;gap:4px;max-height:50vh;overflow:auto"></div>' +
      '<div id="_abf-wfoot" style="margin-top:14px;display:flex;justify-content:flex-end"></div>'
    );
    const wlist = document.getElementById('_abf-wlist');
    const wprog = document.getElementById('_abf-wprog');
    let filled = 0, skipped = 0, failed = 0;

    function logRow(text, color, bg, border) {
      if (!wlist) return;
      const row = document.createElement('div');
      row.style.cssText = 'font-size:12px;padding:5px 10px;border-radius:6px;color:' + color + ';background:' + bg + ';border:1px solid ' + border;
      row.innerHTML = text;
      wlist.appendChild(row);
      wlist.scrollTop = wlist.scrollHeight;
    }

    for (let i = 0; i < proposals.length; i++) {
      const p = proposals[i];
      try {
        // Re-read current value to guarantee we never clobber a non-empty addr
        // (another user/tab may have filled it since the preview).
        const cur = await SB.from(p.table).select('heimilisfang').eq('id', p.id).single();
        if (cur.error) throw cur.error;
        if (!isBlank(cur.data && cur.data.heimilisfang)) {
          skipped++;
          logRow('⏭ ' + esc(p.nafn) + ' — átti þegar heimilisfang, sleppt', '#92400e', '#fffbeb', '#fde68a');
        } else {
          const r = await SB.from(p.table).update({ heimilisfang: p.heimilisfang_full }).eq('id', p.id);
          if (r.error) throw r.error;
          filled++;
          logRow('✓ ' + esc(p.nafn) + ' → ' + esc(p.heimilisfang_full), '#166534', '#f0fdf4', '#bbf7d0');
        }
      } catch (e) {
        failed++;
        logRow('✗ ' + esc(p.nafn) + ' — villa: ' + esc(e.message || e), '#991b1b', '#fef2f2', '#fecaca');
      }
      if (wprog) wprog.textContent = 'Vista… ' + (i + 1) + ' / ' + proposals.length;
    }

    _running = false;
    if (wprog) {
      wprog.innerHTML = '<strong>Lokið.</strong> ' + filled + ' fylltir' +
        (skipped ? ' · ' + skipped + ' sleppt (áttu þegar heimilisfang)' : '') +
        (failed ? ' · ' + failed + ' villur' : '');
    }
    toast('📍 ' + filled + ' heimilisföng fyllt' + (failed ? ' · ' + failed + ' villur' : ''));

    const wfoot = document.getElementById('_abf-wfoot');
    if (wfoot) {
      wfoot.innerHTML = '<button id="_abf-done" type="button" style="padding:8px 16px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">Loka</button>';
      const done = document.getElementById('_abf-done');
      if (done) done.onclick = () => {
        closeModal();
        // Refresh the Fyrirtæki·yfirferð view if it's the one in front.
        try { if (window.FyrirtaekiYfirferd && FyrirtaekiYfirferd.load) FyrirtaekiYfirferd.load(); } catch (_) {}
        try { if (window.Companies && Companies.load) Companies.load(); } catch (_) {}
      };
    }
  }

  // ── Mount the launcher button into patch-198's toolbar(s) ──────────────────
  // Patch 198 builds #view-fyrirtaeki-yfirferd with two `.bar` rows (one per
  // tab). We add our button to each so the tool is reachable from where the
  // "Vantar heimili" filter already lives. Idempotent; survives re-renders.
  function makeBtn() {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = '_abf-launch';
    b.textContent = BTN_LABEL;
    b.style.cssText = 'padding:7px 12px;border:1px solid #0ea5e9;border-radius:8px;background:#0ea5e9;color:#fff;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap';
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); open(); });
    return b;
  }
  function mountButtons() {
    const view = document.getElementById('view-fyrirtaeki-yfirferd');
    if (!view) return;
    view.querySelectorAll('section[data-sec] .bar').forEach(bar => {
      if (bar.querySelector('._abf-launch')) return;
      bar.appendChild(makeBtn());
    });
  }
  // Poll (the view is created lazily and re-rendered on tab switches).
  setInterval(mountButtons, 1200);
  setTimeout(mountButtons, 1500);

  // Public API (also usable from the console / other patches).
  window.AddressBackfill = {
    open,
    collect: collectCandidates,
    lookup: lookupKt,
    version: 'v1'
  };

  console.log('[address-backfill v1] installed');
})();
/* === END ADDRESS BACKFILL === */
