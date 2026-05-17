/* === ÚTTEKTARSKÝRSLA v2 ===
 *
 * Skýrsla vegna úttektar á brunaslöngum, slökkvitækjum og öðrum búnaði
 * (ef við á) hjá fyrirtæki — passar við sniðmátið sem Slökkvitæki ehf
 * fylgir út í lok hverrar þjónustulotu.
 *
 * ── Sniðmát (frá raunverulegu skjali) ────────────────────────────────────
 *   Helluhrauni 10, 220 Hafnarfjörður
 *   Sími: 565 4080, kt. 600508-0400
 *
 *   Skýrsla vegna úttektar á brunaslöngum, slökkvitækjum og öðrum búnaði
 *   (ef við á) hjá fyrirtækinu [Nafn], [Heimilisfang] kt: [Kt]
 *
 *   Tæki voru yfirfarin af Slökkvitæki ehf í [mánuður ár]
 *
 *   Slökkvitæki léttvatn 6-9 ltr. Fjöldi: X  Í lagi: X
 *   Slökkvitæki duft 2 kg.        Fjöldi: X  Í lagi: X
 *   Slökkvitæki duft 6-12 kg.     Fjöldi: X  Í lagi: X
 *   Slökkvitæki Co2 2 kg.         Fjöldi: X  Í lagi: X
 *   Slökkvitæki Co2 5 kg.         Fjöldi: X  Í lagi: X
 *   Brunaslöngur                  Fjöldi: X  Í lagi: X
 *   Eldvarnarteppi                Fjöldi: X  Í lagi: X
 *   Reykskynjarar                 Fjöldi: X  Í lagi: X
 *
 *   Annað: [Frjáls texti um aðgerðir, t.d. endurhlaðin tæki, slangaprófun…]
 *
 *   Athugasemdir: [Frjáls athugasemdir]
 *
 *   Fyrir hönd Slökkvitæki ehf
 *   [Nafn starfsmanns]
 *
 * ── Aðgangur ──────────────────────────────────────────────────────────────
 *   Á fyrirtækisspjaldi: nýr „📋 Úttektarskýrsla" hnappur. Smellur opnar
 *   form með sjálfvirku talningu úr DB (notandi getur breytt) + frjálst
 *   textasvæði fyrir Annað og Athugasemdir + nafn starfsmanns. Prentar
 *   sem A4 portrait.
 */
(() => {
  if (window.__visitReportInstalled) return;
  window.__visitReportInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function getSB() { return (window.DB && window.DB.sb) || null; }
  function fmtMonthYear(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const months = ['janúar','febrúar','mars','apríl','maí','júní','júlí','ágúst','september','október','nóvember','desember'];
    return months[d.getMonth()] + ' ' + d.getFullYear();
  }
  function fmtDateLong(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const months = ['janúar','febrúar','mars','apríl','maí','júní','júlí','ágúst','september','október','nóvember','desember'];
    return d.getDate() + '. ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  // ── Categories — match the paper template exactly ────────────────────────
  // Each category has a matcher function that takes a unit and returns true.
  const CATEGORIES = [
    {
      key: 'lettvatn',
      label: 'Slökkvitæki léttvatn 6-9 ltr.',
      match: u => /léttvatn|lettvatn|vatn/i.test(u.type || '') && /6|7|8|9/.test(String(u.size || ''))
    },
    {
      key: 'duft_2',
      label: 'Slökkvitæki duft 2 kg.',
      match: u => /duft|abc/i.test(u.type || '') && /^2(\b|\.|kg)/i.test(String(u.size || '').trim())
    },
    {
      key: 'duft_6_12',
      label: 'Slökkvitæki duft 6-12 kg.',
      match: u => /duft|abc/i.test(u.type || '') && /^(6|7|8|9|10|11|12)(\b|\.|kg)/i.test(String(u.size || '').trim())
    },
    {
      key: 'co2_2',
      label: 'Slökkvitæki Co2 2 kg.',
      match: u => /co2|kolsýra|kolsyra/i.test(u.type || '') && /^2(\b|\.|kg)/i.test(String(u.size || '').trim())
    },
    {
      key: 'co2_5',
      label: 'Slökkvitæki Co2 5 kg.',
      match: u => /co2|kolsýra|kolsyra/i.test(u.type || '') && /^5(\b|\.|kg)/i.test(String(u.size || '').trim())
    },
    {
      key: 'slongur',
      label: 'Brunaslöngur',
      match: u => /slöng|slong|brunaslang|hose/i.test(u.type || '')
    },
    {
      key: 'teppi',
      label: 'Eldvarnarteppi',
      match: u => /teppi|eldvarn|fire blanket/i.test(u.type || '')
    },
    {
      key: 'reyk',
      label: 'Reykskynjarar',
      match: u => /reyk|skynjari|smoke/i.test(u.type || '')
    }
  ];

  function isUnitOk(u) {
    return !u.status || u.status === 'active';
  }

  function categorize(units) {
    const result = {};
    CATEGORIES.forEach(c => { result[c.key] = { total: 0, ok: 0, units: [] }; });
    const matched = new Set();
    units.forEach(u => {
      for (const c of CATEGORIES) {
        if (matched.has(u.id)) continue;
        if (c.match(u)) {
          result[c.key].total++;
          if (isUnitOk(u)) result[c.key].ok++;
          result[c.key].units.push(u);
          matched.add(u.id);
          break; // only count once per unit
        }
      }
    });
    return result;
  }

  // ── Inject button into companies-main detail header ───────────────────────
  function decorateCompanyDetail() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const actionsRow = main.querySelector('div[style*="display:flex"][style*="gap:7px"]');
    if (!actionsRow) return;
    if (actionsRow.querySelector('._vr-btn')) return;
    // Find company id
    const editBtn = actionsRow.querySelector('button[onclick^="Companies.openEdit"]');
    const m = editBtn && editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
    if (!m) return;
    const coId = +m[1];

    const btn = document.createElement('button');
    btn.className = 'btn btn-outline btn-sm _vr-btn';
    btn.type = 'button';
    btn.style.cssText = 'background:#eff6ff;color:#1e40af;border-color:#bfdbfe;font-weight:600';
    btn.innerHTML = '📋 Úttektarskýrsla';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openReportDialog(coId);
    });
    actionsRow.appendChild(btn);
  }

  // ── Dialog: edit category counts + Annað + Athugasemdir + name ───────────
  async function openReportDialog(coId) {
    const co = (window.Companies && Companies.list || []).find(c => c.id === coId);
    if (!co) { alert('Fyrirtæki fannst ekki'); return; }

    const allUnits = (window.DB && window.DB.cache && window.DB.cache.units || []).filter(u => u.client === co.nafn);
    const cats = categorize(allUnits);

    const today = new Date().toISOString().slice(0,10);
    // Last technician name from previous reports (stored in localStorage)
    const lastTech = localStorage.getItem('_vr_last_tech') || '';

    // Build a default "Annað" suggestion from data
    const okCount = Object.values(cats).reduce((s, c) => s + c.ok, 0);
    const totalCount = Object.values(cats).reduce((s, c) => s + c.total, 0);
    let defaultAnnad = '';
    if (totalCount > 0) {
      defaultAnnad = 'Öll slökkvitæki yfirfarin' + (okCount === totalCount ? ' og vottuð í lagi.' : '. ' + okCount + ' af ' + totalCount + ' í lagi.');
    }

    let dlg = document.getElementById('_vr-dlg');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_vr-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100040;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px';

    const catRows = CATEGORIES.map(c => {
      const cnt = cats[c.key] || { total: 0, ok: 0 };
      return '<div style="display:grid;grid-template-columns:1fr 90px 90px;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #f1f5f9">' +
        '<div style="font-size:13px;color:#0f172a">' + esc(c.label) + '</div>' +
        '<div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;color:#64748b">Fjöldi:</span><input type="text" data-cat="' + c.key + '" data-field="total" value="' + cnt.total + '" style="width:50px;padding:5px 7px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:13px;text-align:center"></div>' +
        '<div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;color:#64748b">Í lagi:</span><input type="text" data-cat="' + c.key + '" data-field="ok" value="' + cnt.ok + '" style="width:50px;padding:5px 7px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:13px;text-align:center"></div>' +
      '</div>';
    }).join('');

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.3);width:min(640px,calc(100vw - 24px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#1e40af,#1e3a8a);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<h3 style="margin:0;font-size:17px;font-weight:700">📋 Úttektarskýrsla</h3>' +
            '<div style="font-size:12px;color:#bfdbfe;margin-top:2px">' + esc(co.nafn) + '</div>' +
          '</div>' +
          '<button id="_vr-x" type="button" style="background:transparent;border:1px solid #3b82f6;color:#fff;font-size:20px;width:36px;height:36px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
        '<div style="padding:18px 22px;flex:1;overflow:auto">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">' +
            '<div>' +
              '<label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Mánuður / dagsetning</label>' +
              '<input id="_vr-date" type="date" value="' + today + '" style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;box-sizing:border-box;margin-top:4px">' +
            '</div>' +
            '<div>' +
              '<label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Starfsmaður</label>' +
              '<input id="_vr-tech" type="text" placeholder="t.d. Elías" value="' + esc(lastTech) + '" style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;box-sizing:border-box;margin-top:4px">' +
            '</div>' +
          '</div>' +
          '<div style="margin-bottom:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px">' +
            '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Tæki á staðnum (talning úr kerfinu — breytanleg)</div>' +
            catRows +
            '<div style="margin-top:8px;font-size:11px;color:#94a3b8;line-height:1.4">Sláðu inn <strong>x</strong> ef ekkert tæki er í þeim flokki, eða <strong>já</strong> / <strong>nei</strong> til að merkja allt í lagi án númers.</div>' +
          '</div>' +
          '<div style="margin-bottom:14px">' +
            '<label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Annað (aðgerðir, endurhleðsla, slangaprófun, …)</label>' +
            '<textarea id="_vr-annad" rows="3" placeholder="t.d. Öll slökkvitæki yfirfarin og vottuð í lagi. 1 Duftstæki nr 2459 endurhlaðið og vottað í lagi. Brunaslanga prófuð á fullum þrýsting og vottuð í lagi" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;line-height:1.5;resize:vertical;box-sizing:border-box;margin-top:4px">' + esc(defaultAnnad) + '</textarea>' +
          '</div>' +
          '<div>' +
            '<label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Athugasemdir</label>' +
            '<textarea id="_vr-notes" rows="2" placeholder="Frjáls athugasemdir…" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;line-height:1.5;resize:vertical;box-sizing:border-box;margin-top:4px"></textarea>' +
          '</div>' +
        '</div>' +
        '<div style="padding:12px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;gap:8px;justify-content:flex-end">' +
          '<button id="_vr-cancel" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
          '<button id="_vr-print" type="button" style="padding:9px 18px;background:#1e40af;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">🖨 Prenta skýrslu</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_vr-x').addEventListener('click', close);
    dlg.querySelector('#_vr-cancel').addEventListener('click', close);

    dlg.querySelector('#_vr-print').addEventListener('click', () => {
      const date = dlg.querySelector('#_vr-date').value || today;
      const tech = dlg.querySelector('#_vr-tech').value.trim();
      const annad = dlg.querySelector('#_vr-annad').value.trim();
      const notes = dlg.querySelector('#_vr-notes').value.trim();
      const counts = {};
      CATEGORIES.forEach(c => {
        const totalEl = dlg.querySelector('input[data-cat="' + c.key + '"][data-field="total"]');
        const okEl    = dlg.querySelector('input[data-cat="' + c.key + '"][data-field="ok"]');
        counts[c.key] = {
          total: totalEl ? totalEl.value.trim() : '0',
          ok: okEl ? okEl.value.trim() : '0'
        };
      });
      // Save tech name for next time
      if (tech) localStorage.setItem('_vr_last_tech', tech);
      close();
      buildAndPrintReport(co, counts, { date, tech, annad, notes });
    });
  }

  // ── Build and open the printable HTML ────────────────────────────────────
  function buildAndPrintReport(co, counts, opts) {
    const monthYear = fmtMonthYear(opts.date);
    const dateLong = fmtDateLong(opts.date);

    const catLines = CATEGORIES.map(c => {
      const cnt = counts[c.key] || { total: '0', ok: '0' };
      // If both are "x" or "0", display as the user typed
      const totalDisp = cnt.total || 'x';
      const okDisp = cnt.ok || 'x';
      return '<div class="cat-line">' +
        '<span class="cat-label">' + esc(c.label) + '</span> ' +
        '<span class="cat-counts">Fjöldi: <strong>' + esc(totalDisp) + '</strong> &nbsp;Í lagi: <strong>' + esc(okDisp) + '</strong></span>' +
      '</div>';
    }).join('');

    const ktLine = co.kennitala ? ' kt:' + esc(co.kennitala) : '';
    const heim = co.heimilisFang || co.heimilisfang || '';

    // 2026-05-17: read brand from AppSettings so Stillingar → Branding can edit it live.
    // Two distinct identities (during the slow merge of Slökkvitæki ehf into Brunahólf ehf):
    //   compNameLogo  → visual identity at the top (logo area). Auto-trims " ehf"
    //                   from the legal name to give the cleaner customer-facing logo
    //                   ("Slökkvitæki ehf" → "Slökkvitæki"). When the company eventually
    //                   renames to "Brunahólf ehf", the logo automatically becomes "Brunahólf".
    //   compNameLegal → legal entity name used in body text ("Tæki voru yfirfarin af…",
    //                   "Fyrir hönd…") and VAT references. Keeps the "ehf".
    // Note: the in-app top banner uses banner_text directly (NOT this trim), so it can
    //   keep "Slökkvitæki ehf" internally if the user prefers.
    const b = (window.AppSettings && window.AppSettings.path('branding')) || {};
    const compNameLegal = b.company_name || 'Slökkvitæki ehf';
    const compNameLogo  = compNameLegal.replace(/\s+ehf\.?\s*$/i, '');
    const tagline       = b.tagline      || 'Brunahólf';
    const addrLine = (b.address1 || b.address2)
      ? [b.address1, b.address2].filter(Boolean).join(', ')
      : 'Helluhrauni 10, 220 Hafnarfjörður';
    const phoneStr = b.phone     || '565-4080';
    const ktStr    = b.kennitala || '600508-0400';

    const html =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Úttektarskýrsla — ' + esc(co.nafn) + '</title>' +
      '<style>' +
        '@media print{@page{size:A4;margin:18mm 16mm}}' +
        'body{margin:0;padding:18mm 16mm;font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#fff;font-size:12pt;line-height:1.5}' +
        '@media print{body{padding:0}}' +
        '.hdr{margin-bottom:18px}' +
        '.hdr .org{font-size:13pt;font-weight:700}' +
        '.hdr .tag{font-size:11pt;color:#0f172a;margin-bottom:4px}' +
        '.hdr .meta{font-size:11pt;color:#0f172a}' +
        '.title{margin:18px 0;font-size:13pt;line-height:1.55}' +
        '.subtitle{margin:14px 0 16px;font-size:12pt;font-style:italic}' +
        '.cat-line{padding:4px 0;font-size:12pt}' +
        '.cat-label{display:inline-block;min-width:300px}' +
        '.cat-counts{color:#0f172a}' +
        '.cat-counts strong{font-weight:700}' +
        '.section{margin:18px 0}' +
        '.section .lbl{font-weight:700}' +
        '.section .body{white-space:pre-wrap;margin-top:4px}' +
        '.signature{margin-top:36px;line-height:1.6}' +
        '.signature .above{height:40px;border-bottom:1px solid #0f172a;width:280px;margin-bottom:6px}' +
        '.toolbar{padding:10px 16px;background:#f4f4f4;border-bottom:1px solid #ddd;text-align:center;font-size:12pt}' +
        '.toolbar button{padding:7px 18px;font-size:12pt;cursor:pointer;margin:0 4px}' +
        '@media print{.toolbar{display:none}}' +
      '</style></head><body>' +
        '<div class="toolbar">' +
          '<button onclick="window.print()">🖨 Prenta / Vista PDF</button>' +
          '<button onclick="window.close()">Loka</button>' +
        '</div>' +
        '<div class="hdr">' +
          '<div class="org">' + esc(compNameLogo) + '</div>' +
          (tagline ? '<div class="tag">' + esc(tagline) + '</div>' : '') +
          '<div class="meta">' + esc(addrLine) + '</div>' +
          '<div class="meta">Sími: ' + esc(phoneStr) + ', kt. ' + esc(ktStr) + '</div>' +
        '</div>' +
        '<div class="title">' +
          'Skýrsla vegna úttektar á brunaslöngum, slökkvitækjum og öðrum búnaði (ef við á) hjá fyrirtækinu <strong>' + esc(co.nafn) + '</strong>' +
          (heim ? ', ' + esc(heim) : '') + esc(ktLine) +
        '</div>' +
        '<div class="subtitle">Tæki voru yfirfarin af ' + esc(compNameLegal) + ' í ' + esc(monthYear) + '</div>' +
        '<div class="categories">' + catLines + '</div>' +
        (opts.annad ? '<div class="section"><span class="lbl">Annað:</span> <span class="body">' + esc(opts.annad).replace(/\n/g, '<br>') + '</span></div>' : '<div class="section"><span class="lbl">Annað:</span></div>') +
        (opts.notes ? '<div class="section"><span class="lbl">Athugasemdir:</span> <span class="body">' + esc(opts.notes).replace(/\n/g, '<br>') + '</span></div>' : '<div class="section"><span class="lbl">Athugasemdir:</span></div>') +
        '<div class="signature">' +
          '<div>Fyrir hönd ' + esc(compNameLegal) + '</div>' +
          '<div class="above"></div>' +
          '<div>' + esc(opts.tech || '') + '</div>' +
        '</div>' +
        '<scr' + 'ipt>setTimeout(function(){window.print();},400);</scr' + 'ipt>' +
      '</body></html>';

    const win = window.open('', 'visit-report', 'width=900,height=1100');
    if (!win) { alert('Sprettigluggi var lokaður — leyfðu sprettiglugga til að prenta.'); return; }
    win.document.write(html);
    win.document.close();
  }

  // ── Watch companies-main for re-renders to inject the button ──────────────
  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(decorateCompanyDetail, 150);
    }).observe(main, { childList: true });
  }
  attach();
  setTimeout(decorateCompanyDetail, 1500);
  setTimeout(decorateCompanyDetail, 3500);

  window.VisitReport = { open: openReportDialog };

  console.log('[visit-report] v2 installed — passar við Slökkvitæki ehf sniðmát');
})();
/* === END ÚTTEKTARSKÝRSLA v2 === */
