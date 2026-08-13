/* === CHECKOUT UNIT PROMPT v1 ===
 *
 * Þegar notandi smellir á GREIÐA / Setja í reikning, og einhver línur í
 * körfu eru þjónustulínur (áfylling, skoðun, viðgerð, …) þá opnast
 * fyrst sjálfvirkur gluggi:
 *
 *   ┌────────────────────────────────────────────────────────┐
 *   │  Skrá tæki fyrir verkbeiðni                            │
 *   ├────────────────────────────────────────────────────────┤
 *   │  Hleðsla CO₂ 5 kg × 2                                  │
 *   │   1.  [SK-2153            ] 📷 Skanna  ✨ Búa til QR   │
 *   │   2.  [Auto: SK-20260508-002] 📷ð Skanna  (Reset)       │
 *   │                                                        │
 *   │  Áfylling slangaprófun × 1                             │
 *   │   1.  [                  ] 📷 Skanna  ✨ Búa til QR    │
 *   │                                                        │
 *   │  ☑ Sleppa skráningu (engin verkbeiðni búin til)        │
 *   │                                                        │
 *   │           [Hætta við]   [✓ Halda áfram með GREIÐA]     │
 *   └────────────────────────────────────────────────────────┘
 *
 * „✨ Búa til QR" býr sjálfvirkt til raðnúmer í forminu:
 *   SL-YYYYMMDD-NNN
 *  (þar sem NNN er teljari fyrir þetta dropoff)
 *
 * Eftir að notandi staðfestir er checkout-flæðið haldið áfram. Patch 105
 * sér til þess að raðnúmerin enda upp sem `units` array í verkbeiðninni.
 *
 * Notandi getur líka „skipped" (engar línur skráðar) til að fara í gegn
 * eins og áður.
 */
(() => {
  if (window.__checkoutUnitPromptInstalled) return;
  window.__checkoutUnitPromptInstalled = true;

  const SKIP_ATTR = '_skipUnitPrompt';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function genQrSerial(idx) {
    const d = new Date();
    const ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const seq = String(idx + 1).padStart(3, '0');
    return 'SL-' + ymd + '-' + seq;
  }

  // ── Read cart lines from DOM (pos.js state.lines is in closure) ──────────
  function readCartLines() {
    // We rely on the DOM rendering — find each line's desc + qty
    const lines = [];
    document.querySelectorAll('button.pos-qty-up').forEach(qBtn => {
      const lineEl = qBtn.closest('div[style*="border-bottom"]') || qBtn.parentElement?.parentElement;
      if (!lineEl) return;
      const idx = +qBtn.dataset.idx;
      const descEl = lineEl.querySelector('div[style*="font-weight:600"]');
      const desc = descEl ? descEl.textContent.trim() : '';
      // Qty is in the span between - and + buttons
      const qtyEl = lineEl.querySelector('span[style*="font-weight:600"][style*="text-align:center"]');
      let qty = 1;
      if (qtyEl) {
        const m = (qtyEl.textContent || '').match(/(\d+)/);
        if (m) qty = +m[1];
      }
      // Detect type by icon (🔧 service vs 🛒 product)
      const iconEl = lineEl.querySelector('div[style*="background"]');
      const ic = iconEl ? iconEl.textContent.trim() : '';
      const type = ic === '🔧' ? 'service' : 'product';
      lines.push({ idx, desc, qty, type, lineEl });
    });
    return lines;
  }

  // ── Customer info ────────────────────────────────────────────────────────
  function readCustomer() {
    // 2026-05-10 (F4 fix): Prefer POS state — when the user picks a customer
    // via the unified search (patch 114, by kennitala/name), the state is set
    // there but not necessarily mirrored to pos-cust-nafn input. Falling back
    // to "Staðgreitt" in the title was confusing for selected B2B customers.
    let nafn = '', simi = '', kt = '';
    try {
      if (window.POS && typeof POS.getState === 'function') {
        const c = (POS.getState() || {}).customer || {};
        nafn = (c.nafn || '').trim();
        simi = (c.simi || '').trim();
        kt = (c.kt || '').trim();
      }
    } catch (_) {}
    if (!nafn) nafn = ((document.getElementById('pos-cust-nafn') || {}).value || '').trim();
    if (!simi) simi = ((document.getElementById('pos-cust-simi') || {}).value || '').trim();
    if (!kt)   kt   = ((document.getElementById('pos-kt') || {}).value || '').trim();
    return { nafn, simi, kt };
  }

  // ── Open the prompt dialog ───────────────────────────────────────────────
  function openPrompt(serviceLines, onConfirm, onCancel) {
    const customer = readCustomer();
    let dlg = document.getElementById('_cup-dlg');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_cup-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100080;background:rgba(15,23,42,0.65);display:flex;align-items:center;justify-content:center;padding:16px';

    let counter = 0;
    const sections = serviceLines.map((line, lineIdx) => {
      const inputs = [];
      // 2026-05-12: Gram-based service lines (CO₂ 100gr × 20, ml, etc.) use
      // qty as the WEIGHT poured into a single cylinder — NOT as a count of
      // separate tæki. Ask for ONE serial in that case, not qty inputs.
      // Mirrors the isGramBased detection in pos.js verklidur creation.
      const _isGramBased = /\b\d+\s*(gr?\.?|gramm|ml|litr?)\b/i.test(line.desc || '');
      const _rowCount = _isGramBased ? 1 : line.qty;
      for (let i = 0; i < _rowCount; i++) {
        counter++;
        const myCounter = counter;
        inputs.push(
          '<div style="display:grid;grid-template-columns:30px 1fr 36px 84px;gap:6px;align-items:center;padding:5px 0">' +
            '<div style="font-size:12px;color:#64748b;font-weight:700;text-align:center">' + (i + 1) + '.</div>' +
            '<input data-line="' + lineIdx + '" data-row="' + i + '" data-counter="' + myCounter + '" type="text" placeholder="Raðnúmer" autocomplete="off" style="padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;font-family:\'Courier New\',monospace;font-weight:700;letter-spacing:0.04em;box-sizing:border-box">' +
            '<button data-line="' + lineIdx + '" data-row="' + i + '" class="_cup-scan" type="button" title="Skanna" style="padding:8px 4px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">📷</button>' +
            '<button data-line="' + lineIdx + '" data-row="' + i + '" data-counter="' + myCounter + '" class="_cup-genqr" type="button" title="Búa til nýtt raðnúmer með QR-kóða" style="padding:8px 6px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">✨ QR</button>' +
          '</div>'
        );
      }
      // 2026-05-10 (#4): „Auto-fylla allar" takki birtist í haus línunnar þegar
      // qty > 1. Eitt smell býr til QR-form raðnúmer fyrir öll tæki sem eru
      // tóm — sparar 9 smelli fyrir 10× sömu hleðslu.
      const bulkBtn = (_rowCount > 1)
        ? '<button class="_cup-bulk" data-line="' + lineIdx + '" type="button" title="Búa til Ræðnúmer fyrir öll tóm" style="padding:5px 11px;background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;font-weight:700">✨ Auto-fylla öll</button>'
        : '';
      return '' +
        '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:10px;background:#fff">' +
          '<div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;gap:8px">' +
            '<span>🔧 ' + esc(line.desc) + ' <span style="color:#64748b;font-weight:500">× ' + line.qty + (_isGramBased ? ' <em style="color:#16a34a;font-style:normal">(sami kútur)</em>' : '') + '</span></span>' +
            bulkBtn +
          '</div>' +
          inputs.join('') +
          '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-top:8px;margin-bottom:4px">Athugasemd</label>' +
          '<input data-line="' + lineIdx + '" data-field="note" type="text" placeholder="t.d. Þrýstingur lítill, ósk viðskiptavinar..." style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;box-sizing:border-box">' +
        '</div>';
    }).join('');

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.35);width:min(620px,calc(100vw - 24px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<h3 style="margin:0;font-size:17px;font-weight:700">Skrá tæki fyrir verkbeiðni</h3>' +
            '<div style="font-size:11px;color:#dcfce7;margin-top:2px">' + esc(customer.nafn || 'Staðgreitt') + (customer.simi ? ' · ' + esc(customer.simi) : '') + '</div>' +
          '</div>' +
          '<button id="_cup-x" type="button" style="background:transparent;border:1px solid #22c55e;color:#fff;font-size:20px;width:36px;height:36px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
        '<div style="padding:18px 22px;overflow:auto;flex:1;background:#f8fafc">' +
          '<p style="margin:0 0 12px;font-size:12px;color:#64748b;line-height:1.5">Skannaðu strikamerki á tækjunum sem viðskiptavinurinn kom með, eða smelltu á <strong>✨ QR</strong> til að búa til nýtt raðnúmer (notað ef tækið er ekki með strikamerki).</p>' +
          sections +
          '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;padding:10px 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:7px;font-size:12px;color:#92400e;cursor:pointer">' +
            '<input id="_cup-skip" type="checkbox" style="width:16px;height:16px;cursor:pointer">' +
            'Sleppa þessari skráningu (engin verkbeiðni búin til)' +
          '</label>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 22px;border-top:1px solid #e2e8f0;background:#fff">' +
          '<button id="_cup-cancel" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
          '<button id="_cup-skip-btn" type="button" style="padding:9px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:12px;color:#64748b" title="Halda áfram án þess að skrá tæki">→ Án skráningar</button>' +
          '<button id="_cup-go" type="button" style="padding:9px 18px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">✓ Halda áfram</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    // Focus first input
    setTimeout(() => {
      const first = dlg.querySelector('input[data-line]');
      if (first) first.focus();
    }, 50);

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) { close(); onCancel && onCancel(); }});
    dlg.querySelector('#_cup-x').addEventListener('click', () => { close(); onCancel && onCancel(); });
    dlg.querySelector('#_cup-cancel').addEventListener('click', () => { close(); onCancel && onCancel(); });

    // Wire scan buttons
    dlg.querySelectorAll('._cup-scan').forEach(btn => {
      btn.addEventListener('click', () => {
        const sel = 'input[data-line="' + btn.dataset.line + '"][data-row="' + btn.dataset.row + '"]';
        const inp = dlg.querySelector(sel);
        if (window.BarcodeMgr && window.BarcodeMgr.scan) {
          window.BarcodeMgr.scan(text => {
            if (text && inp) inp.value = String(text).trim();
          });
        } else {
          alert('Skannarvirkni ekki hlaðin');
        }
      });
    });

    // Wire generate-QR buttons
    let nextSeq = 1;
    dlg.querySelectorAll('._cup-genqr').forEach(btn => {
      btn.addEventListener('click', () => {
        const sel = 'input[data-line="' + btn.dataset.line + '"][data-row="' + btn.dataset.row + '"]';
        const inp = dlg.querySelector(sel);
        if (!inp) return;
        // If field has a value, treat click as "Reset" — clear it
        // 2026-05-10 (B5+): Confirm.show í stað native confirm. Note: handler
        // is sync; we early-return and re-trigger after Confirm resolves.
        if (inp.value.trim()) {
          Confirm.show('Hreinsa núverandi raðnúmer og búa til nýtt?', {okText:'Hreinsa'}).then(ok => {
            if (!ok) return;
            inp.value = genQrSerial(nextSeq++);
            inp.style.background = '#fef3c7';
            setTimeout(() => { inp.style.background = ''; }, 600);
          });
          return;
        }
        inp.value = genQrSerial(nextSeq++);
        inp.style.background = '#fef3c7';
        setTimeout(() => { inp.style.background = ''; }, 600);
      });
    });

    // 2026-05-10 (#4): Wire bulk auto-fill button — fills all empty raðnúmer
    // inputs in this line section with generated QR serials in one click.
    dlg.querySelectorAll('._cup-bulk').forEach(btn => {
      btn.addEventListener('click', () => {
        const lineIdx = btn.dataset.line;
        const sel = 'input[data-line="' + lineIdx + '"][data-row]';
        let filled = 0;
        dlg.querySelectorAll(sel).forEach(inp => {
          if (!inp.value.trim()) {
            inp.value = genQrSerial(nextSeq++);
            inp.style.background = '#dcfce7';
            setTimeout(() => { inp.style.background = ''; }, 800);
            filled++;
          }
        });
        if (filled && window.Toast && Toast.show) Toast.show('✨ ' + filled + ' raðnúmer búin til');
      });
    });

    // Auto-tab: Enter on serial input → next; on last → save
    dlg.querySelectorAll('input[data-line][type="text"]').forEach((inp, i, arr) => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const next = arr[i + 1];
          if (next) next.focus();
          else dlg.querySelector('#_cup-go').focus();
        }
      });
    });

    // Skip checkbox enables/disables Halda áfram appearance
    const skipCb = dlg.querySelector('#_cup-skip');
    skipCb.addEventListener('change', () => {
      const goBtn = dlg.querySelector('#_cup-go');
      if (skipCb.checked) {
        goBtn.style.opacity = '0.65';
        goBtn.title = 'Engin verkbeiðni verður búin til';
      } else {
        goBtn.style.opacity = '';
        goBtn.title = '';
      }
    });

    function collect() {
      const result = serviceLines.map((line, lineIdx) => {
        const noteEl = dlg.querySelector('input[data-line="' + lineIdx + '"][data-field="note"]');
        const inputs = dlg.querySelectorAll('input[data-line="' + lineIdx + '"][type="text"]:not([data-field])');
        const units = [];
        inputs.forEach(inp => {
          const v = inp.value.trim();
          if (v) units.push({ serial: v, notes: '' });
        });
        return {
          desc: line.desc,
          units,
          lineNote: noteEl ? noteEl.value.trim() : ''
        };
      });
      return { skip: skipCb.checked, result };
    }

    dlg.querySelector('#_cup-skip-btn').addEventListener('click', async () => {
      const warnMsg =
        '⚠ Ertu viss?\n\n' +
        'Engin verkbeiðni verður búin til.\n' +
        'Það þýðir að verkstæðismaður sér ekki þetta verk,\n' +
        'og þú þarft sjálf/ur að vinna tækið áður en\n' +
        'viðskiptavinur getur sótt það.\n\n' +
        'Notaðu þetta aðeins fyrir hreinar vörusölur\n' +
        '(t.d. nýtt slökkvitæki keypt í heilu lagi).';
      if (window.Confirm && Confirm.show) {
        const ok = await Confirm.show(warnMsg);
        if (!ok) return;
      } else {
        if (!confirm(warnMsg)) return;
      }
      const { result } = collect();
      close();
      onConfirm({ skipVerk: true, lines: result });
    });

    dlg.querySelector('#_cup-go').addEventListener('click', async () => {
      const { skip, result } = collect();
      // Same warning if the user ticked the skip checkbox and is now hitting Halda áfram.
      if (skip) {
        const warnMsg =
          '⚠ Þú hefur hakað í „Sleppa verkbeiðnum".\n\n' +
          'Engin verkbeiðni verður búin til — verkstæðismaður\n' +
          'sér ekki þetta verk. Heldurðu áfram?';
        if (window.Confirm && Confirm.show) {
          const ok = await Confirm.show(warnMsg);
          if (!ok) return;
        } else {
          if (!confirm(warnMsg)) return;
        }
      }
      close();
      onConfirm({ skipVerk: skip, lines: result });
    });
  }

  // ── Hook the GREIÐA button — capture phase, runs first ────────────────────
  function attachToCheckout() {
    const btn = document.getElementById('pos-checkout');
    if (!btn) { setTimeout(attachToCheckout, 800); return; }
    if (btn.dataset._cupHooked === '1') { setTimeout(attachToCheckout, 1500); return; }
    btn.dataset._cupHooked = '1';
    btn.addEventListener('click', e => {
      // If our flow already prepared, allow through
      if (btn[SKIP_ATTR]) {
        btn[SKIP_ATTR] = false;
        return;
      }

      // Are there any service lines?
      const allLines = readCartLines();
      // 2026-08-13: QR/raðnúmera-glugginn fylgir verkbeiðnunum — aðeins línur
      // merktar „fer á verkstæði" (krefst_verkbeidni) fá hann, ekki hver
      // þjónustulína. Bein sala yfir borðið sleppur.
      const serviceLines = allLines.filter(l => l.krefst_verkbeidni === true);
      if (!serviceLines.length) return; // no services → nothing to prompt

      // 2026-05-11: If the user already opted to skip verkbeiðnir in the
      // payment dialog (patch 07's "Sleppa verkbeiðnir" checkbox), there's
      // no point opening this dialog — we'd just ask the same question
      // again. Let the checkout proceed without an extra modal.
      if (window._pendingSkipVerk === true) return;

      // 2026-05-18: Global skip flag — AppSettings.prentun.skip_unit_prompt.
      // When true (Agnar's default), the unit-registration dialog never
      // opens; checkout proceeds straight to patch 07's payment dialog.
      // Toggle off in Stillingar -> Prentun if you want the prompt back.
      if (window.AppSettings && window.AppSettings.path('prentun.skip_unit_prompt') === true) return;

      // Stop the original handler
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      openPrompt(serviceLines, async (data) => {
        // Save to patch 105's PENDING map so verkbeidnir.insert is enriched
        if (window.SalaLineUnits && window.SalaLineUnits.setForLine) {
          // Clear any prior data
          if (window.SalaLineUnits.clear) window.SalaLineUnits.clear();
          data.lines.forEach((entry, i) => {
            // Use the line index from serviceLines for matching
            const lineIdx = serviceLines[i].idx;
            window.SalaLineUnits.setForLine(lineIdx, {
              desc: entry.desc,
              units: entry.units,
              lineNote: entry.lineNote
            });
          });
        }
        // Set skip-verk if user chose
        if (data.skipVerk) {
          window._pendingSkipVerk = true;
        }
        // Re-trigger checkout, bypassing BOTH our hook (SKIP_ATTR) AND
        // patch 07's checkout-dialog hook (scdProceed). Without setting
        // scdProceed, patch 07's capture-phase listener on document would
        // fire first and re-open its payment-method dialog → user sees
        // the cash/card prompt twice.
        btn[SKIP_ATTR] = true;
        btn.dataset.scdProceed = '1';
        btn.click();
      }, () => {
        // Cancelled — don't do anything
      });
    }, true); // capture phase
    setTimeout(attachToCheckout, 1500);
  }
  attachToCheckout();

  console.log('[checkout-unit-prompt] installed — GREIÐA opnar fyrst skráningu á tækjum');
})();
/* === END CHECKOUT UNIT PROMPT v1 === */
