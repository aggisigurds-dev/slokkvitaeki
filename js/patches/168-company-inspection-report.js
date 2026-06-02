/* === COMPANY INSPECTION REPORT v2 ===
 *
 * Generates a printable A4 "úttektarskýrsla" matching the existing IKEA 2025
 * paper template exactly:
 *   • Slökkvitæki Brunahólf logo (PNG asset, no inline SVG)
 *   • Address line + intro sentence
 *   • Customer line (name, address, kt) pulled from fyrirtaeki
 *   • Month label "í maí 2026"
 *   • Fixed list of 8 equipment categories with Fjöldi / Í lagi per row
 *   • Annað: section from the blue notes box (tripState.notes)
 *   • Athugasemdir: section ("Engar athugasemdir" by default)
 *   • Footer: "Fyrir hönd Slökkvitæki ehf" + Skoðunaraðili name
 *
 * NO PRICES — this is a delivery confirmation, not an invoice.
 *
 * Public API: window.CompanyInspectionReport.open(coId)
 */
(() => {
  if (window.__companyInspectionReportInstalled) return;
  window.__companyInspectionReportInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function loadTripState(coId) {
    try { return JSON.parse(localStorage.getItem('slokk_trip_' + coId) || '{}'); }
    catch (_) { return {}; }
  }

  // ── Bucket a uttaeki row into one of the 8 PDF categories ───────────────
  // Returns the category key, or null if the unit doesn't fit any known
  // bucket (very rare — would be a weird type label).
  function categorize(u) {
    const t = String(u.type || '').toLowerCase();
    const sizeStr = String(u.size || '').toLowerCase();
    // Extract leading numeric part of size (e.g. "6 kg" → 6, "6-9 ltr" → 6)
    const sizeNum = parseFloat(sizeStr.replace(',', '.')) || 0;

    if (/léttv|lettv|abf|froð|frod/.test(t)) return 'lettvatn';
    if (/\bduft\b|\babc\b|\bpfc\b/.test(t)) {
      return sizeNum <= 3 ? 'duft_small' : 'duft_big';
    }
    if (/co2|co₂|co_?2|kolsyr|kolsýr/.test(t)) {
      return sizeNum <= 3 ? 'co2_small' : 'co2_big';
    }
    if (/brunaslang|brunaslöng|brunaslong|slang|hose/.test(t)) return 'slang';
    if (/teppi|blanket|eldvarn/.test(t)) return 'teppi';
    if (/reykskynj|smoke/.test(t)) return 'reyk';
    return null;
  }

  // Fixed display order matching the PDF — keys map to (label, sublabel)
  const CATEGORIES = [
    { k: 'lettvatn',  label: 'Slökkvitæki léttvatn 6-9 ltr.' },
    { k: 'duft_small', label: 'Slökkvitæki duft 2 kg.' },
    { k: 'duft_big',   label: 'Slökkvitæki duft 6-12 kg.' },
    { k: 'co2_small',  label: 'Slökkvitæki Co₂ 2 kg.' },
    { k: 'co2_big',    label: 'Slökkvitæki Co₂ 5 kg.' },
    { k: 'slang',      label: 'Brunaslöngur' },
    { k: 'teppi',      label: 'Eldvarnarteppi' },
    { k: 'reyk',       label: 'Reykskynjarar' }
  ];

  async function fetchUnits(client) {
    const sb = getSB();
    if (!sb) return [];
    let all = [];
    let from = 0, pageSize = 1000;
    while (true) {
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

  // ── Open report ─────────────────────────────────────────────────────────
  async function openReport(coId) {
    if (!coId) { alert('Ekkert fyrirtæki valið'); return; }
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }

    const c = await SB.from('fyrirtaeki')
      .select('id,nafn,kennitala,heimilisfang,simi,netfang')
      .eq('id', coId).maybeSingle();
    if (c.error || !c.data) { alert('Fyrirtæki fannst ekki'); return; }
    const co = c.data;

    const units = await fetchUnits(co.nafn);
    const counts = {};
    CATEGORIES.forEach(c => counts[c.k] = 0);
    units.forEach(u => {
      const k = categorize(u);
      if (k && counts[k] != null) counts[k]++;
    });

    const trip = loadTripState(coId);
    const annad = (trip.notes || '').trim();
    const athugasemdir = (trip.athugasemdir_skyrsla || '').trim() || 'Engar athugasemdir';
    const skodunaradili = (trip.skodunaradili || '').trim();

    const now = new Date();
    // 2026-06-02: Agnar asked for the inspection date in dd.mm.yyyy instead of
    // the "í maí 2026" month phrase.
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const datePhrase = dd + '.' + mm + '.' + now.getFullYear();

    const html = buildReportHtml({ co, counts, annad, athugasemdir, skodunaradili, datePhrase });
    showModal(html);
  }

  function buildReportHtml(ctx) {
    const { co, counts, annad, athugasemdir, skodunaradili, datePhrase } = ctx;

    const ktLine = co.kennitala ? ' kt: ' + esc(co.kennitala) : '';
    const addrLine = co.heimilisfang ? ', ' + esc(co.heimilisfang) : '';
    const custLine = esc(co.nafn || '—') + addrLine + ktLine;

    // 8 category rows, all always shown. Empty count → "x".
    // 2026-05-21: pulled the three columns ~30% closer. Each cell trimmed
    // to 3px horizontal padding on the inner sides so Fjöldi/Í lagi hug
    // the label tightly. Text size + vertical padding unchanged.
    const rowsHtml = CATEGORIES.map(c => {
      const n = counts[c.k] || 0;
      const fjoldi = n > 0 ? String(n) : 'x';
      const ilagi  = n > 0 ? 'Já'      : 'x';
      return `<tr>
        <td style="padding:7px 4px 7px 8px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;white-space:nowrap">${esc(c.label)}</td>
        <td style="padding:7px 4px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;white-space:nowrap;width:1%"><strong>Fjöldi:</strong> ${esc(fjoldi)}</td>
        <td style="padding:7px 8px 7px 4px;font-size:13px;color:#0f172a;border-bottom:1px solid #e2e8f0;white-space:nowrap;width:1%"><strong>Í lagi:</strong> ${esc(ilagi)}</td>
      </tr>`;
    }).join('');

    return `<!DOCTYPE html><html lang="is"><head><meta charset="utf-8">
      <title>Úttektarskýrsla — ${esc(co.nafn || '')}</title>
      <style>
        @page { size: A4; margin: 16mm 18mm; }
        html, body { margin:0; padding:0; font-family: Arial, Helvetica, sans-serif; color:#0f172a; background:#fff; line-height:1.45; }
        table { width:100%; border-collapse: collapse; }
        @media print { .no-print { display:none !important; } }
      </style></head><body>

        <!-- Letterhead: logo on the left, address on the right -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
          ${(window.SlokkLogo && SlokkLogo.imgHtml) ? SlokkLogo.imgHtml({heightPx:88, alt:'Slökkvitæki Brunahólf', objectPosition:'left'}) : '<img src="/img/logo.png?v=20260520b" alt="Slökkvitæki Brunahólf" style="height:88px;width:264px;object-fit:contain;object-position:left">'}
          <div style="text-align:right;font-size:12px;color:#0f172a;line-height:1.5">
            Helluhrauni 10, 220 Hafnarfjörður<br>
            Sími: 565 4080, kt. 600508-0400
          </div>
        </div>

        <!-- Intro sentence + customer line -->
        <div style="font-size:13px;color:#0f172a;line-height:1.55;margin-bottom:18px">
          Skýrsla vegna úttektar á brunaslöngum, slökkvitækjum og öðrum búnaði (ef við á) hjá fyrirtækinu
        </div>
        <div style="font-size:13px;color:#0f172a;border-bottom:1px solid #0f172a;padding-bottom:6px;margin-bottom:16px">
          ${custLine}
        </div>

        <!-- Inspection statement with date -->
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:14px">
          Tæki voru yfirfarin af Slökkvitæki ehf ${esc(datePhrase)}
        </div>

        <!-- Fixed equipment category table — centered as a readable mid-
             page block. Width:auto + label column flex-grow gives uniform
             rows where every "Fjöldi:" and "Í lagi:" line up vertically. -->
        <table style="margin:0 auto 22px;border-collapse:collapse">
          <tbody>${rowsHtml}</tbody>
        </table>

        <!-- Annað -->
        <div style="font-size:13px;color:#0f172a;margin-bottom:18px">
          <strong>Annað:</strong>
          <div style="margin-top:4px;white-space:pre-wrap;line-height:1.6">${annad ? esc(annad) : '—'}</div>
        </div>

        <!-- Athugasemdir -->
        <div style="font-size:13px;color:#0f172a;margin-bottom:60px">
          <strong>Athugasemdir:</strong>
          <div style="margin-top:4px;white-space:pre-wrap;line-height:1.6">${esc(athugasemdir)}</div>
        </div>

        <!-- Sign-off -->
        <div style="font-size:13px;color:#0f172a;line-height:1.7">
          Fyrir hönd <strong>Slökkvitæki ehf</strong>
        </div>
        <div style="margin-top:28px;font-size:13px;color:#0f172a">
          ${skodunaradili ? esc(skodunaradili) : '_______________________'}
        </div>

      </body></html>`;
  }

  function showModal(html) {
    const existing = document.getElementById('_cir-modal');
    if (existing) existing.remove();
    const dlg = document.createElement('div');
    dlg.id = '_cir-modal';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,0.7);display:flex;align-items:center;justify-content:center;padding:18px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.4);width:min(900px,calc(100vw - 32px));height:calc(100vh - 60px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:11px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc">' +
          '<div style="font-size:13px;font-weight:700;color:#0f172a">📄 Úttektarskýrsla</div>' +
          '<div style="display:flex;gap:8px">' +
            '<button id="_cir-print" type="button" style="padding:7px 14px;background:#0d6efd;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">🖨 Prenta</button>' +
            '<button id="_cir-close" type="button" style="padding:7px 14px;background:#fff;border:1px solid #cbd5e1;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;color:#475569">✕ Loka</button>' +
          '</div>' +
        '</div>' +
        // 2026-05-20: use srcdoc as a fallback for sandboxed browsers, but
        // the image needs to load from /img/ so we set src directly to a
        // blob URL so the same-origin policy lets it load.
        '<iframe id="_cir-frame" style="flex:1;border:none;background:#fff"></iframe>' +
      '</div>';
    document.body.appendChild(dlg);
    const frame = dlg.querySelector('#_cir-frame');
    // Write into the iframe document so relative URLs (/img/...) resolve
    // against the parent origin instead of about:srcdoc.
    frame.addEventListener('load', () => {});
    frame.src = 'about:blank';
    setTimeout(() => {
      const doc = frame.contentDocument || frame.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
    }, 30);

    function close() { dlg.remove(); }
    dlg.querySelector('#_cir-close').addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    });
    dlg.querySelector('#_cir-print').addEventListener('click', () => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch (e) { alert('Get ekki prentað: ' + (e.message || e)); }
    });
  }

  window.CompanyInspectionReport = { open: openReport };
  console.log('[patch-168] Company inspection report v2 installed — PDF-style, no prices');
})();
/* === END COMPANY INSPECTION REPORT v2 === */
