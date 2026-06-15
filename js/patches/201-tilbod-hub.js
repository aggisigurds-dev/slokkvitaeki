/* === TILBOÐ & SAMNINGAR HUB v1 ===
   Sjálfstæð síða í hliðarstiku sem safnar saman tilboðs-/samningsformum:
     • Brunaviðvörunarkerfi tilboð  → endurnýtir window.BrunakerfiTilbod
     • Slökkvitæki tilboð           → frjáls línuform (lýsing × magn × verð)
     • Þjónustusamningur            → samningsform
   Öll form vistuð í AppSettings (samhæft milli notenda) og birt í einum lista,
   endur-breytanleg + prentanleg (A4). „📤 Senda starfsmanni" gefur fókus-tengil
   (?fokus=1) sem felur valmyndina svo starfsmaður sér aðeins þessa síðu — en
   gögnin samhæfast áfram milli ykkar (AppSettings/Supabase).
*/
(() => {
  if (window.__tilbodHubInstalled) return;
  window.__tilbodHubInstalled = true;

  const VIEW = 'tilbodhub';
  const KEY = 'tilbod_hub';            // slökkvitæki + samningar
  const BK_KEY = 'brunakerfi_tilbod';  // brunaviðvörunarkerfi (patch 200)
  const VSK = 0.24;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const grp = n => { const v = Math.round(Number(n) || 0); return v.toLocaleString('is-IS').replace(/,/g, '.'); };
  const fmtKr = n => grp(n) + ' kr';
  const pn = v => { const s = String(v == null ? '' : v).replace(/[.\s]/g, '').replace(',', '.'); const n = parseFloat(s); return isFinite(n) ? n : 0; };
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; };
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const fmtDate = iso => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return iso; return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };
  const branding = () => (window.AppSettings && window.AppSettings.path && window.AppSettings.path('branding')) || {};
  const BRAND = { black: '#1b1b1b', red: '#C0341D', orange: '#F07A1E' };

  const getHub = () => { const a = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(KEY)) || []; return Array.isArray(a) ? a.slice() : []; };
  const getBk = () => { const a = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(BK_KEY)) || []; return Array.isArray(a) ? a.slice() : []; };
  async function saveHub(arr) { if (!window.AppSettings || !window.AppSettings.save) { alert('Vista ekki tiltæk'); return false; } return await window.AppSettings.save({ [KEY]: arr }); }
  async function saveBk(arr) { if (!window.AppSettings || !window.AppSettings.save) return false; return await window.AppSettings.save({ [BK_KEY]: arr }); }

  // ---------- shared modal helpers ----------
  function modal(titleHtml, bodyHtml, footHtml) {
    document.getElementById('_th-modal')?.remove();
    const ov = document.createElement('div');
    ov.id = '_th-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99999;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px';
    ov.innerHTML = `<div style="background:#fff;border-radius:14px;max-width:920px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.3);margin:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:15px 20px;background:linear-gradient(95deg,#1b1b1b 0%,#3a1d14 55%,#C0341D 120%);border-bottom:3px solid #F07A1E;position:sticky;top:0;border-radius:14px 14px 0 0;z-index:2">
        <h2 style="margin:0;font-size:17px;color:#fff;display:flex;align-items:center;gap:8px">${titleHtml}</h2>
        <button id="_th-x" type="button" style="border:none;background:rgba(255,255,255,.16);border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:18px;color:#fff">×</button>
      </div>
      <div style="padding:18px 20px">${bodyHtml}</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid #e2e8f0;position:sticky;bottom:0;background:#fff;border-radius:0 0 14px 14px">${footHtml}</div>
    </div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector('#_th-x').onclick = close;
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    return { ov, close };
  }
  const custFields = c => `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
      <label style="font-size:11px;color:#64748b;font-weight:700">Viðskiptavinur<input id="_th-nafn" type="text" value="${esc(c.nafn || '')}" placeholder="Nafn fyrirtækis" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box"></label>
      <label style="font-size:11px;color:#64748b;font-weight:700">Kennitala<input id="_th-kt" type="text" value="${esc(c.kennitala || '')}" placeholder="000000-0000" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box"></label>
      <label style="font-size:11px;color:#64748b;font-weight:700">Dagsetning<input id="_th-date" type="date" value="${esc(c._date || todayISO())}" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box"></label>
      <label style="font-size:11px;color:#64748b;font-weight:700;grid-column:1 / -1">Heimilisfang<input id="_th-addr" type="text" value="${esc(c.heimilisfang || '')}" placeholder="Heimilisfang" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box"></label>
    </div>`;
  const readCust = ov => ({ nafn: ov.querySelector('#_th-nafn').value.trim(), kennitala: ov.querySelector('#_th-kt').value.trim(), heimilisfang: ov.querySelector('#_th-addr').value.trim() });
  const footBtns = `<button id="_th-cancel" type="button" style="padding:10px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Loka</button>
    <button id="_th-print" type="button" style="padding:10px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#0f172a;font-weight:700">🖨 Prenta PDF</button>
    <button id="_th-save" type="button" style="padding:10px 20px;border:none;border-radius:8px;background:linear-gradient(95deg,#C0341D,#F07A1E);color:#fff;cursor:pointer;font:inherit;font-size:13px;font-weight:800;box-shadow:0 2px 8px rgba(192,52,29,.3)">💾 Vista</button>`;

  // ---------- print (A4 sheet, brand) ----------
  function docShell(titleBadge, dateStr, custBlock, inner) {
    const b = branding();
    const primary = (b.primary_color || '#C0341D').trim();
    const logo = (b.logo_url || '').trim();
    const head = logo ? `<img src="${esc(logo)}" alt="" style="max-height:56px;max-width:240px">` : `<div style="font-size:24px;font-weight:800;color:#1b1b1b">${esc(b.company_name || 'Slökkvitæki ehf')}</div>`;
    return '<!DOCTYPE html><html lang="is"><head><meta charset="utf-8"><title>' + esc(titleBadge) + '</title>' +
      '<style>@page{size:A4;margin:12mm}html,body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#eef1f4}' +
      '.sheet{max-width:760px;margin:22px auto;background:#fff;padding:28px 34px;box-shadow:0 6px 24px rgba(0,0,0,.14);border-radius:5px}' +
      'table{width:100%;border-collapse:collapse}.btn{padding:9px 18px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:700}' +
      '@media print{body{background:#fff}.sheet{margin:0;max-width:none;box-shadow:none;border-radius:0;padding:0}.no-print{display:none!important}}</style></head><body><div class="sheet">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ' + primary + ';padding-bottom:10px;margin-bottom:16px">' +
        '<div>' + head + '<div style="font-size:11px;color:#475569;margin-top:8px;line-height:1.4">' +
          (b.address1 ? esc(b.address1) + (b.address2 ? ', ' + esc(b.address2) : '') + '<br>' : '') +
          (b.phone ? 'Sími ' + esc(b.phone) : '') + (b.phone && b.email ? ' · ' : '') + (b.email ? esc(b.email) : '') +
          (b.kennitala ? '<br>kt. ' + esc(b.kennitala) : '') + '</div></div>' +
        '<div style="text-align:right"><div style="display:inline-block;background:' + primary + ';color:#fff;padding:3px 12px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">' + esc(titleBadge) + '</div>' +
          '<div style="font-size:11px;color:#64748b;margin-top:8px">' + esc(dateStr) + '</div></div>' +
      '</div>' + custBlock + inner +
      '<div class="no-print" style="margin-top:24px;text-align:center"><button class="btn" style="background:' + primary + ';color:#fff" onclick="window.print()">🖨 Prenta / vista PDF</button></div>' +
      '</div></body></html>';
  }
  const custPrintBlock = c => '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:11px 14px;margin-bottom:14px">' +
    '<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Viðskiptavinur</div>' +
    '<div style="font-size:15px;font-weight:700;margin-top:3px">' + esc(c.nafn || '—') + '</div>' +
    '<div style="font-size:11px;color:#475569;margin-top:2px">' + (c.kennitala ? 'kt. ' + esc(c.kennitala) : '') + (c.heimilisfang ? (c.kennitala ? ' · ' : '') + esc(c.heimilisfang) : '') + '</div></div>';
  function printDoc(html) {
    document.getElementById('_th-print-modal')?.remove();
    const ov = document.createElement('div');
    ov.id = '_th-print-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:100000;display:flex;flex-direction:column;padding:18px';
    ov.innerHTML = '<div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:10px">' +
      '<button id="_th-pp" type="button" style="padding:9px 18px;border:none;border-radius:8px;background:#C0341D;color:#fff;font-weight:700;cursor:pointer">🖨 Prenta</button>' +
      '<button id="_th-pc" type="button" style="padding:9px 18px;border:none;border-radius:8px;background:#fff;color:#475569;font-weight:700;cursor:pointer">Loka</button></div>' +
      '<iframe id="_th-frame" style="flex:1;border:none;background:#fff;border-radius:10px" sandbox="allow-same-origin allow-modals allow-scripts"></iframe>';
    document.body.appendChild(ov);
    const frame = ov.querySelector('#_th-frame'); frame.srcdoc = html;
    ov.querySelector('#_th-pc').onclick = () => ov.remove();
    ov.querySelector('#_th-pp').onclick = () => { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) {} };
  }

  // ====================== SLÖKKVITÆKI TILBOÐ (free lines) ======================
  // Aðal-slökkvitæki (sýnd sjálfgefið): Duft · Léttvatn · Kolsýra (CO₂)
  const PRIMARY_RE = /duft|léttvatn|lettvatn|co2|co₂|kolsýr|kolsyr/i;
  async function loadVorur() {
    try {
      if (window.DB && DB.sb) {
        const r = await DB.sb.from('vorur').select('nafn,verd_an_vsk,flokkur,virkt').order('flokkur', { ascending: true }).order('nafn', { ascending: true });
        const arr = (r.data || []).filter(p => p.virkt !== false).map(p => ({ lysing: p.nafn, magn: 0, verd: Math.round(p.verd_an_vsk || 0), afsl: 0, primary: PRIMARY_RE.test(p.nafn || '') }));
        arr.sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0)); // aðaltæki efst
        return arr;
      }
    } catch (e) {}
    return [];
  }
  async function openSlokk(existing) {
    const o = existing ? JSON.parse(JSON.stringify(existing)) : null;
    const c = Object.assign({}, (o && o.customer) || {}, { _date: (o && o.date) || todayISO() });
    // New tilboð: prefill with the live vörur price list (editable); editing: saved lines.
    let lines = (o && o.lines && o.lines.length) ? o.lines.map(l => ({ ...l, primary: true })) : await loadVorur();
    if (!lines.length) lines = [{ lysing: '', magn: 1, verd: 0, afsl: 0, primary: true }];
    let showOthers = false;
    const body = custFields(c) +
      '<div style="overflow:auto;border:1px solid #e2e8f0;border-radius:10px;max-height:40vh"><table><thead><tr style="background:#fbeee7;border-bottom:2px solid #F07A1E">' +
        '<th style="text-align:left;padding:8px;font-size:10px;color:#1b1b1b;text-transform:uppercase;font-weight:800">Vara / lýsing</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:#1b1b1b;text-transform:uppercase;font-weight:800">Magn</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:#C0341D;text-transform:uppercase;font-weight:800">Verð án vsk</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:#1b1b1b;text-transform:uppercase;font-weight:800">Afsl %</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:#1b1b1b;text-transform:uppercase;font-weight:800">Samtals</th><th></th>' +
      '</tr></thead><tbody id="_th-tbody"></tbody></table></div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap">' +
        '<button id="_th-others" type="button" style="padding:7px 12px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;color:#475569;cursor:pointer;font:inherit;font-size:12px;font-weight:700">▾ Sjá aðrar vörur</button>' +
        '<button id="_th-addrow" type="button" style="padding:7px 12px;border:1px dashed #C0341D;border-radius:7px;background:#fff;color:#C0341D;cursor:pointer;font:inherit;font-size:12px;font-weight:700">+ Bæta við vöru / línu</button>' +
      '</div>' +
      totalsBlock();
    const m = modal('🧯 Slökkvitæki — tilboð' + (o ? ' <span style="font-size:12px;color:#fbbf24;font-weight:400">· breyti</span>' : ''), body, footBtns);
    const ov = m.ov, tbody = ov.querySelector('#_th-tbody');
    function rowHtml(l, i) {
      return `<tr data-i="${i}" data-primary="${l.primary ? 1 : 0}" class="${l.primary ? '' : '_th-other'}">
        <td style="padding:4px 6px"><input data-f="lysing" type="text" value="${esc(l.lysing || '')}" placeholder="Lýsing á vöru / þjónustu" style="width:100%;min-width:220px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;box-sizing:border-box"></td>
        <td style="padding:4px 6px"><input data-f="magn" type="number" min="0" step="1" value="${l.magn != null ? l.magn : 1}" style="width:58px;padding:6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right"></td>
        <td style="padding:4px 6px"><input data-f="verd" type="text" inputmode="numeric" value="${grp(l.verd)}" style="width:92px;padding:6px;border:1px solid #e0a58f;border-radius:6px;font:inherit;font-size:12px;text-align:right;font-weight:600;color:#C0341D"></td>
        <td style="padding:4px 6px"><input data-f="afsl" type="number" min="0" max="100" step="1" value="${l.afsl || ''}" placeholder="0" style="width:52px;padding:6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right"></td>
        <td data-cell="line" style="padding:4px 8px;font-size:12px;text-align:right;font-weight:600;white-space:nowrap">—</td>
        <td style="padding:4px 6px"><button data-del type="button" style="border:none;background:#fef2f2;color:#dc2626;border-radius:6px;width:26px;height:26px;cursor:pointer">×</button></td>
      </tr>`;
    }
    function draw() { tbody.innerHTML = lines.map(rowHtml).join(''); recompute(); applyOtherVis(); }
    function applyOtherVis() {
      const others = tbody.querySelectorAll('._th-other');
      others.forEach(tr => { tr.style.display = showOthers ? '' : 'none'; });
      const ob = ov.querySelector('#_th-others');
      if (ob) { ob.style.display = others.length ? '' : 'none'; ob.textContent = showOthers ? '▴ Fela aðrar vörur' : ('▾ Sjá aðrar vörur (' + others.length + ')'); }
    }
    function collect() {
      const out = [];
      tbody.querySelectorAll('tr').forEach(tr => out.push({ lysing: tr.querySelector('[data-f="lysing"]').value.trim(), magn: num(tr.querySelector('[data-f="magn"]').value), verd: pn(tr.querySelector('[data-f="verd"]').value), afsl: num(tr.querySelector('[data-f="afsl"]').value), primary: tr.dataset.primary === '1' }));
      return out;
    }
    function recompute() {
      const ls = collect();
      tbody.querySelectorAll('tr').forEach((tr, i) => { const lt = ls[i].magn * ls[i].verd * (1 - ls[i].afsl / 100); tr.querySelector('[data-cell="line"]').textContent = ls[i].verd > 0 ? fmtKr(lt) : '—'; });
      paintTotals(ov, ls);
    }
    ov.addEventListener('input', e => { if (e.target.tagName === 'INPUT') recompute(); });
    ov.addEventListener('blur', e => { if (e.target.matches && e.target.matches('[data-f="verd"]')) e.target.value = grp(pn(e.target.value)); }, true);
    tbody.addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b) { lines = collect(); lines.splice(+b.closest('tr').dataset.i, 1); draw(); } });
    ov.querySelector('#_th-addrow').onclick = () => { lines = collect(); lines.push({ lysing: '', magn: 1, verd: 0, afsl: 0, primary: true }); draw(); };
    ov.querySelector('#_th-others').onclick = () => { showOthers = !showOthers; applyOtherVis(); };
    draw();
    function build() {
      const ls = collect().filter(l => l.lysing && l.verd >= 0 && (l.magn > 0));
      const t = totals(ls, pn(ov.querySelector('#_th-tdisc').value));
      return { id: (o && o.id) || ('S' + Date.now()), type: 'slokkvitaeki', created_at: (o && o.created_at) || new Date().toISOString(), updated_at: new Date().toISOString(), date: ov.querySelector('#_th-date').value || todayISO(), customer: readCust(ov), lines: ls, total_disc: num(ov.querySelector('#_th-tdisc').value), an_vsk: Math.round(t.an), vsk: Math.round(t.vsk), m_vsk: Math.round(t.m_vsk) };
    }
    ov.querySelector('#_th-print').onclick = () => printDoc(slokkHtml(build()));
    ov.querySelector('#_th-save').onclick = async () => {
      const f = build();
      if (!f.customer.nafn) { alert('Sláðu inn viðskiptavin.'); return; }
      if (!f.lines.length) { alert('Bættu við a.m.k. einni línu með lýsingu.'); return; }
      const arr = getHub(); const i = arr.findIndex(x => x.id === f.id); if (i >= 0) arr[i] = f; else arr.unshift(f);
      if (await saveHub(arr) !== false) { m.close(); render(); }
    };
  }
  function slokkHtml(o) {
    const rows = o.lines.map(l => { const lt = l.magn * l.verd * (1 - l.afsl / 100); return '<tr>' +
      '<td style="padding:7px 9px;font-size:12px;border-bottom:1px solid #f1f5f9">' + esc(l.lysing) + '</td>' +
      '<td style="padding:7px 9px;font-size:12px;text-align:right;border-bottom:1px solid #f1f5f9">' + (Math.round(l.magn * 100) / 100) + '</td>' +
      '<td style="padding:7px 9px;font-size:12px;text-align:right;border-bottom:1px solid #f1f5f9">' + fmtKr(l.verd) + '</td>' +
      '<td style="padding:7px 9px;font-size:12px;text-align:right;border-bottom:1px solid #f1f5f9">' + (l.afsl ? l.afsl + '%' : '—') + '</td>' +
      '<td style="padding:7px 9px;font-size:12px;text-align:right;font-weight:600;border-bottom:1px solid #f1f5f9">' + fmtKr(lt) + '</td></tr>'; }).join('');
    const t = totals(o.lines, o.total_disc);
    const inner = '<div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px">Tilboð — slökkvitæki & þjónusta</div>' +
      '<table><thead><tr style="background:#f8fafc">' +
        '<th style="text-align:left;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Lýsing</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Magn</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Einingaverð</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Afsl</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Samtals án vsk</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' + totRows(t, o.total_disc) +
      '<div style="margin-top:24px;font-size:11px;color:#64748b">Tilboð þetta gildir í 30 daga.</div>';
    return docShell('Tilboð', fmtDate(o.date), custPrintBlock(o.customer), inner);
  }

  // ====================== SLÖKKVITÆKI SÉRVERÐ (per-unit, no grand total) ======================
  async function openServerd(existing) {
    const o = existing ? JSON.parse(JSON.stringify(existing)) : null;
    const c = Object.assign({}, (o && o.customer) || {}, { _date: (o && o.date) || todayISO() });
    let lines;
    if (o && o.lines && o.lines.length) lines = o.lines.map(l => ({ ...l, primary: true }));
    else { const v = await loadVorur(); lines = v.map(p => ({ n: p.lysing, full: Math.round((p.verd || 0) * (1 + VSK)), afsl: 0, include: false, primary: p.primary })); }
    if (!lines.length) lines = [{ n: '', full: 0, afsl: 0, include: true, primary: true }];
    let showOthers = false;
    const inSt = 'padding:6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right';
    const body = custFields(c) +
      '<div style="font-size:11.5px;color:#64748b;margin-bottom:8px">Hakaðu við tækin sem fá sérverð, settu afslátt — sérverð (m.vsk) reiknast per tæki. Ekkert heildarsamtala.</div>' +
      '<div style="overflow:auto;border:1px solid #e2e8f0;border-radius:10px;max-height:46vh"><table><thead><tr style="background:#fbeee7;border-bottom:2px solid #F07A1E">' +
        '<th style="width:34px"></th>' +
        '<th style="text-align:left;padding:8px;font-size:10px;color:#1b1b1b;text-transform:uppercase;font-weight:800">Tæki / vara</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:#1b1b1b;text-transform:uppercase;font-weight:800">Fullt verð</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:#1b1b1b;text-transform:uppercase;font-weight:800">Afsl %</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:#C0341D;text-transform:uppercase;font-weight:800">Sérverð m.vsk</th><th></th>' +
      '</tr></thead><tbody id="_th-tbody"></tbody></table></div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap">' +
        '<button id="_th-others" type="button" style="padding:7px 12px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;color:#475569;cursor:pointer;font:inherit;font-size:12px;font-weight:700">▾ Sjá aðrar vörur</button>' +
        '<button id="_th-addrow" type="button" style="padding:7px 12px;border:1px dashed #C0341D;border-radius:7px;background:#fff;color:#C0341D;cursor:pointer;font:inherit;font-size:12px;font-weight:700">+ Bæta við tæki / línu</button>' +
      '</div>';
    const m = modal('🏷 Slökkvitæki — sérverð' + (o ? ' <span style="font-size:12px;color:#fbbf24;font-weight:400">· breyti</span>' : ''), body, footBtns);
    const ov = m.ov, tbody = ov.querySelector('#_th-tbody');
    function rowHtml(l, i) {
      const fin = (l.full || 0) * (1 - (l.afsl || 0) / 100);
      return `<tr data-i="${i}" data-primary="${l.primary ? 1 : 0}" class="${l.primary ? '' : '_th-other'}" style="${l.include ? 'background:#f0fdf4' : ''}">
        <td style="text-align:center;padding:4px 6px"><input data-f="inc" type="checkbox" ${l.include ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer"></td>
        <td style="padding:4px 6px"><input data-f="n" type="text" value="${esc(l.n || '')}" placeholder="Tæki / vara" style="width:100%;min-width:210px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;box-sizing:border-box"></td>
        <td style="padding:4px 6px"><input data-f="full" type="text" inputmode="numeric" value="${grp(l.full)}" style="${inSt};width:94px"></td>
        <td style="padding:4px 6px"><input data-f="afsl" type="number" min="0" max="100" step="1" value="${l.afsl || ''}" placeholder="0" style="${inSt};width:54px"></td>
        <td data-cell="final" style="padding:4px 8px;font-size:12.5px;text-align:right;font-weight:700;color:#C0341D;white-space:nowrap">${fmtKr(fin)}</td>
        <td style="padding:4px 6px"><button data-del type="button" style="border:none;background:#fef2f2;color:#dc2626;border-radius:6px;width:26px;height:26px;cursor:pointer">×</button></td>
      </tr>`;
    }
    function draw() { tbody.innerHTML = lines.map(rowHtml).join(''); recompute(); applyOtherVis(); }
    function applyOtherVis() {
      const others = tbody.querySelectorAll('._th-other');
      others.forEach(tr => { tr.style.display = showOthers ? '' : 'none'; });
      const ob = ov.querySelector('#_th-others');
      if (ob) { ob.style.display = others.length ? '' : 'none'; ob.textContent = showOthers ? '▴ Fela aðrar vörur' : ('▾ Sjá aðrar vörur (' + others.length + ')'); }
    }
    function collect() {
      const out = [];
      tbody.querySelectorAll('tr').forEach(tr => out.push({ n: tr.querySelector('[data-f="n"]').value.trim(), full: pn(tr.querySelector('[data-f="full"]').value), afsl: num(tr.querySelector('[data-f="afsl"]').value), include: tr.querySelector('[data-f="inc"]').checked, primary: tr.dataset.primary === '1' }));
      return out;
    }
    function recompute() {
      const ls = collect();
      tbody.querySelectorAll('tr').forEach((tr, i) => { tr.querySelector('[data-cell="final"]').textContent = fmtKr(ls[i].full * (1 - ls[i].afsl / 100)); tr.style.background = ls[i].include ? '#f0fdf4' : ''; });
    }
    ov.addEventListener('input', e => { if (e.target.tagName === 'INPUT') recompute(); });
    ov.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-f="inc"]')) recompute(); });
    ov.addEventListener('blur', e => { if (e.target.matches && e.target.matches('[data-f="full"]')) e.target.value = grp(pn(e.target.value)); }, true);
    tbody.addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b) { lines = collect(); lines.splice(+b.closest('tr').dataset.i, 1); draw(); } });
    ov.querySelector('#_th-addrow').onclick = () => { lines = collect(); lines.push({ n: '', full: 0, afsl: 0, include: true, primary: true }); draw(); };
    ov.querySelector('#_th-others').onclick = () => { showOthers = !showOthers; applyOtherVis(); };
    draw();
    function build() {
      const ls = collect().filter(l => l.include && l.n);
      return { id: (o && o.id) || ('V' + Date.now()), type: 'serverd', created_at: (o && o.created_at) || new Date().toISOString(), updated_at: new Date().toISOString(), date: ov.querySelector('#_th-date').value || todayISO(), customer: readCust(ov), lines: ls, m_vsk: 0 };
    }
    ov.querySelector('#_th-print').onclick = () => printDoc(serverdHtml(build()));
    ov.querySelector('#_th-save').onclick = async () => {
      const f = build();
      if (!f.customer.nafn) { alert('Sláðu inn viðskiptavin.'); return; }
      if (!f.lines.length) { alert('Hakaðu við a.m.k. eitt tæki.'); return; }
      const arr = getHub(); const i = arr.findIndex(x => x.id === f.id); if (i >= 0) arr[i] = f; else arr.unshift(f);
      if (await saveHub(arr) !== false) { m.close(); render(); }
    };
  }
  function serverdHtml(o) {
    const rows = o.lines.map(l => { const fin = l.full * (1 - (l.afsl || 0) / 100); return '<tr>' +
      '<td style="padding:7px 9px;font-size:12px;border-bottom:1px solid #f1f5f9">' + esc(l.n) + '</td>' +
      '<td style="padding:7px 9px;font-size:12px;text-align:right;border-bottom:1px solid #f1f5f9;color:#94a3b8;text-decoration:' + (l.afsl ? 'line-through' : 'none') + '">' + fmtKr(l.full) + '</td>' +
      '<td style="padding:7px 9px;font-size:12px;text-align:right;border-bottom:1px solid #f1f5f9">' + (l.afsl ? l.afsl + '%' : '—') + '</td>' +
      '<td style="padding:7px 9px;font-size:13px;text-align:right;font-weight:800;color:#C0341D;border-bottom:1px solid #f1f5f9">' + fmtKr(fin) + '</td></tr>'; }).join('');
    const inner = '<div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px">Sérverð á slökkvitækjum — verð m. vsk</div>' +
      '<table><thead><tr style="background:#f8fafc">' +
        '<th style="text-align:left;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Tæki / vara</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Fullt verð</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Afsláttur</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Sérverð</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div style="margin-top:20px;font-size:11px;color:#64748b">Verð eru m. vsk og gilda á meðan samningur er í gildi. Ekkert heildarverð — verð per tæki.</div>';
    return docShell('Sérverð', fmtDate(o.date), custPrintBlock(o.customer), inner);
  }

  // ====================== ÞJÓNUSTUSAMNINGUR ======================
  function openSamn(existing) {
    const o = existing ? JSON.parse(JSON.stringify(existing)) : null;
    const c = Object.assign({}, (o && o.customer) || {}, { _date: (o && o.date) || todayISO() });
    const d = o || {};
    const inp = (id, val, ph) => `<input id="${id}" type="text" value="${esc(val || '')}" placeholder="${esc(ph || '')}" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box">`;
    const body = custFields(c) +
      '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-bottom:12px">' +
        '<label style="font-size:11px;color:#64748b;font-weight:700">Þjónusta' + inp('_th-thjon', d.thjonusta || 'Árleg skoðun og þjónusta slökkvitækja og brunakerfa', '') + '</label>' +
        '<label style="font-size:11px;color:#64748b;font-weight:700">Verð án vsk / ár<input id="_th-verd" type="text" inputmode="numeric" value="' + grp(d.verd || 0) + '" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid #e0a58f;border-radius:7px;font:inherit;font-size:13px;font-weight:600;color:#C0341D;box-sizing:border-box"></label>' +
        '<label style="font-size:11px;color:#64748b;font-weight:700">Tíðni' + inp('_th-tidni', d.tidni || 'Árlega', '') + '</label>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
        '<label style="font-size:11px;color:#64748b;font-weight:700">Gildir frá<input id="_th-fra" type="date" value="' + esc(d.gildir_fra || todayISO()) + '" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box"></label>' +
        '<label style="font-size:11px;color:#64748b;font-weight:700">Uppsagnarfrestur' + inp('_th-upps', d.uppsogn || '3 mánuðir', '') + '</label>' +
      '</div>' +
      '<label style="font-size:11px;color:#64748b;font-weight:700">Skilmálar<textarea id="_th-skilm" rows="5" style="width:100%;margin-top:3px;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:12.5px;box-sizing:border-box;resize:vertical">' + esc(d.skilmalar || 'Verktaki annast reglubundna skoðun, viðhald og endurhleðslu slökkvitækja og eftirlit með brunaviðvörunarkerfi skv. gildandi reglugerðum. Samningurinn endurnýjast sjálfkrafa um eitt ár í senn sé honum ekki sagt upp innan uppsagnarfrests. Verð er án vsk og uppfærist árlega skv. vísitölu.') + '</textarea></label>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:14px"><div style="min-width:280px">' +
        '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#475569"><span>Verð án vsk / ár</span><span id="_th-s-an">—</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#475569"><span>VSK 24%</span><span id="_th-s-vsk">—</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:9px 0;font-size:17px;font-weight:800;color:#C0341D;border-top:3px solid #1b1b1b;margin-top:4px"><span>Samtals m. vsk / ár</span><span id="_th-s-tot">—</span></div>' +
      '</div></div>';
    const m = modal('📜 Þjónustusamningur' + (o ? ' <span style="font-size:12px;color:#fbbf24;font-weight:400">· breyti</span>' : ''), body, footBtns);
    const ov = m.ov;
    function recompute() { const an = pn(ov.querySelector('#_th-verd').value); ov.querySelector('#_th-s-an').textContent = fmtKr(an); ov.querySelector('#_th-s-vsk').textContent = fmtKr(an * VSK); ov.querySelector('#_th-s-tot').textContent = fmtKr(an * (1 + VSK)); }
    ov.addEventListener('input', recompute);
    ov.addEventListener('blur', e => { if (e.target.id === '_th-verd') e.target.value = grp(pn(e.target.value)); }, true);
    recompute();
    function build() {
      const an = pn(ov.querySelector('#_th-verd').value);
      return { id: (o && o.id) || ('M' + Date.now()), type: 'samningur', created_at: (o && o.created_at) || new Date().toISOString(), updated_at: new Date().toISOString(), date: ov.querySelector('#_th-date').value || todayISO(), customer: readCust(ov), thjonusta: ov.querySelector('#_th-thjon').value.trim(), tidni: ov.querySelector('#_th-tidni').value.trim(), gildir_fra: ov.querySelector('#_th-fra').value, uppsogn: ov.querySelector('#_th-upps').value.trim(), skilmalar: ov.querySelector('#_th-skilm').value.trim(), verd: an, an_vsk: Math.round(an), vsk: Math.round(an * VSK), m_vsk: Math.round(an * (1 + VSK)) };
    }
    ov.querySelector('#_th-print').onclick = () => printDoc(samnHtml(build()));
    ov.querySelector('#_th-save').onclick = async () => {
      const f = build();
      if (!f.customer.nafn) { alert('Sláðu inn viðskiptavin.'); return; }
      const arr = getHub(); const i = arr.findIndex(x => x.id === f.id); if (i >= 0) arr[i] = f; else arr.unshift(f);
      if (await saveHub(arr) !== false) { m.close(); render(); }
    };
  }
  function samnHtml(o) {
    const row = (k, v) => '<tr><td style="padding:6px 9px;font-size:12px;color:#64748b;width:38%">' + esc(k) + '</td><td style="padding:6px 9px;font-size:12px;font-weight:600">' + v + '</td></tr>';
    const inner = '<table style="margin-bottom:14px">' +
        row('Þjónusta', esc(o.thjonusta || '')) + row('Tíðni', esc(o.tidni || '')) +
        row('Gildir frá', esc(fmtDate(o.gildir_fra))) + row('Uppsagnarfrestur', esc(o.uppsogn || '')) +
        row('Verð án vsk / ár', fmtKr(o.an_vsk)) + row('VSK 24%', fmtKr(o.vsk)) +
        row('Samtals m. vsk / ár', '<span style="color:#C0341D;font-weight:800">' + fmtKr(o.m_vsk) + '</span>') +
      '</table>' +
      '<div style="font-size:11px;font-weight:700;color:#1b1b1b;margin:14px 0 4px;text-transform:uppercase;letter-spacing:.04em">Skilmálar</div>' +
      '<div style="font-size:12px;line-height:1.55;color:#0f172a;white-space:pre-wrap">' + esc(o.skilmalar || '') + '</div>' +
      '<div style="display:flex;justify-content:space-between;gap:40px;margin-top:40px">' +
        '<div style="flex:1;border-top:1px solid #1b1b1b;padding-top:6px;font-size:11px;color:#64748b">Verktaki</div>' +
        '<div style="flex:1;border-top:1px solid #1b1b1b;padding-top:6px;font-size:11px;color:#64748b">Viðskiptavinur</div>' +
      '</div>';
    return docShell('Þjónustusamningur', fmtDate(o.date), custPrintBlock(o.customer), inner);
  }

  // ---------- totals helpers (shared) ----------
  function totals(lines, td) { let sub = 0; lines.forEach(l => sub += num(l.magn) * num(l.verd) * (1 - num(l.afsl) / 100)); const d = Math.max(0, Math.min(100, num(td))); const an = sub * (1 - d / 100); return { sub, disc: sub - an, an, vsk: an * VSK, m_vsk: an * (1 + VSK) }; }
  function totalsBlock() {
    return '<div style="display:flex;justify-content:flex-end;margin-top:14px"><div style="min-width:320px">' +
      '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#475569"><span>Samtals án vsk</span><span id="_th-sub">—</span></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px;color:#475569"><span>Heildarafsláttur</span><span><input id="_th-tdisc" type="number" min="0" max="100" step="1" value="" placeholder="0" style="width:56px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right"> % <span id="_th-disc" style="margin-left:8px;color:#dc2626"></span></span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#475569;border-top:1px solid #e2e8f0"><span>Án vsk eftir afslátt</span><span id="_th-an">—</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#475569"><span>VSK 24%</span><span id="_th-vsk">—</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:9px 0;font-size:18px;font-weight:800;color:#C0341D;border-top:3px solid #1b1b1b;margin-top:4px"><span>Samtals m. vsk</span><span id="_th-tot">—</span></div>' +
      '</div></div>';
  }
  function paintTotals(ov, lines) { const t = totals(lines, pn(ov.querySelector('#_th-tdisc').value)); ov.querySelector('#_th-sub').textContent = fmtKr(t.sub); ov.querySelector('#_th-disc').textContent = t.disc > 0 ? '− ' + fmtKr(t.disc) : ''; ov.querySelector('#_th-an').textContent = fmtKr(t.an); ov.querySelector('#_th-vsk').textContent = fmtKr(t.vsk); ov.querySelector('#_th-tot').textContent = fmtKr(t.m_vsk); }
  function totRows(t, td) { const r = (l, v, big) => '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:' + (big ? '17px;font-weight:800;border-top:2px solid #1b1b1b;color:#C0341D;margin-top:4px;padding-top:8px' : '12.5px;color:#475569') + '"><span>' + l + '</span><span>' + v + '</span></div>'; return '<div style="display:flex;justify-content:flex-end;margin-top:16px"><div style="min-width:300px">' + r('Samtals án vsk', fmtKr(t.sub)) + (t.disc > 0 ? r('Heildarafsláttur (' + td + '%)', '− ' + fmtKr(t.disc)) : '') + r('Án vsk', fmtKr(t.an)) + r('VSK 24%', fmtKr(t.vsk)) + r('Samtals m. vsk', fmtKr(t.m_vsk), true) + '</div></div>'; }

  // ====================== PAGE RENDER ======================
  const TYPE_META = {
    brunakerfi: { label: 'Brunaviðvörunarkerfi', icon: '🔥', chip: '#fbeee7', col: '#C0341D' },
    slokkvitaeki: { label: 'Slökkvitæki', icon: '🧯', chip: '#fee2e2', col: '#b91c1c' },
    serverd: { label: 'Sérverð', icon: '🏷', chip: '#e0f2fe', col: '#0369a1' },
    samningur: { label: 'Þjónustusamningur', icon: '📜', chip: '#fef3c7', col: '#b45309' },
  };
  function allForms() {
    const hub = getHub().map(f => ({ ...f }));
    const bk = getBk().map(f => ({ ...f, type: 'brunakerfi' }));
    return hub.concat(bk).sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''));
  }
  function render() {
    const main = document.getElementById('tilbodhub-main'); if (!main) return;
    const forms = allForms();
    const btn = (id, c, t) => `<button id="${id}" type="button" style="padding:11px 16px;border:none;border-radius:9px;background:${c};color:#fff;cursor:pointer;font:inherit;font-size:13px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.12)">${t}</button>`;
    main.innerHTML = `<div style="max-width:1100px;margin:0 auto;padding:22px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:6px">
        <div><h1 style="margin:0;font-size:22px;color:#1b1b1b;display:flex;align-items:center;gap:10px">📑 Tilboð &amp; samningar</h1>
          <div style="font-size:12px;color:#64748b;margin-top:2px">Tilboðs- og samningsform — vistast og samhæfast milli ykkar.</div></div>
        <button id="_th-send" type="button" style="padding:9px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:12px;color:#475569" title="Senda starfsmanni tengil sem opnar AÐEINS þessa síðu">📤 Senda starfsmanni</button>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 20px">
        ${btn('_th-new-bk', 'linear-gradient(95deg,#1b1b1b,#C0341D)', '🔥 Nýtt brunakerfi-tilboð')}
        ${btn('_th-new-sl', 'linear-gradient(95deg,#C0341D,#F07A1E)', '🧯 Nýtt slökkvitæki-tilboð')}
        ${btn('_th-new-sv', 'linear-gradient(95deg,#0369a1,#0ea5e9)', '🏷 Nýtt sérverð')}
        ${btn('_th-new-mn', 'linear-gradient(95deg,#b45309,#F07A1E)', '📜 Nýr þjónustusamningur')}
      </div>
      <h2 style="font-size:15px;color:#1b1b1b;margin:0 0 8px">Vistuð form <span style="font-size:12px;color:#64748b;font-weight:400">· ${forms.length}</span></h2>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">${forms.length ? forms.map(rowFor).join('') : '<div style="padding:22px;text-align:center;color:#94a3b8;font-size:13px">Engin form enn — búðu til hér að ofan.</div>'}</div>
    </div>`;
    main.querySelector('#_th-new-bk').onclick = () => { if (window.BrunakerfiTilbod) { window.BrunakerfiTilbod.open(); afterModal(); } else alert('Brunakerfi-tilboð ekki tiltækt'); };
    main.querySelector('#_th-new-sl').onclick = () => openSlokk();
    main.querySelector('#_th-new-sv').onclick = () => openServerd();
    main.querySelector('#_th-new-mn').onclick = () => openSamn();
    main.querySelector('#_th-send').onclick = sendLink;
    forms.forEach(f => {
      const row = main.querySelector('.th-row[data-id="' + f.id + '"][data-type="' + f.type + '"]'); if (!row) return;
      row.querySelector('[data-act="edit"]').onclick = () => editForm(f);
      row.querySelector('[data-act="print"]').onclick = () => printForm(f);
      row.querySelector('[data-act="del"]').onclick = () => delForm(f);
    });
  }
  function rowFor(f) {
    const tm = TYPE_META[f.type] || TYPE_META.slokkvitaeki;
    const sub = f.type === 'samningur' ? esc(f.thjonusta || '') : ((f.lines ? f.lines.length : 0) + (f.type === 'serverd' ? ' tæki' : ' liðir'));
    const amount = f.type === 'serverd' ? '<span style="color:#0369a1;font-size:12px">sérverð</span>' : fmtKr(f.m_vsk);
    return `<div class="th-row" data-id="${esc(f.id)}" data-type="${f.type}" style="display:flex;align-items:center;gap:12px;padding:11px 14px;border-bottom:1px solid #f1f5f9">
      <span style="font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:20px;background:${tm.chip};color:${tm.col};white-space:nowrap">${tm.icon} ${tm.label}</span>
      <div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.customer && f.customer.nafn || '—')}</div>
        <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(fmtDate(f.date))} · ${sub}</div></div>
      <div style="font-size:14px;font-weight:800;color:#1b1b1b;white-space:nowrap;font-variant-numeric:tabular-nums">${amount}</div>
      <button data-act="edit" type="button" style="padding:6px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:12px" title="Breyta">✏️</button>
      <button data-act="print" type="button" style="padding:6px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:12px" title="Prenta PDF">🖨</button>
      <button data-act="del" type="button" style="padding:6px 11px;border:1px solid #fecaca;border-radius:7px;background:#fef2f2;cursor:pointer;font:inherit;font-size:12px;color:#dc2626" title="Eyða">🗑</button>
    </div>`;
  }
  function editForm(f) { if (f.type === 'brunakerfi') { window.BrunakerfiTilbod && window.BrunakerfiTilbod.open(f); afterModal(); } else if (f.type === 'samningur') openSamn(f); else if (f.type === 'serverd') openServerd(f); else openSlokk(f); }
  function printForm(f) { if (f.type === 'brunakerfi') window.BrunakerfiTilbod && window.BrunakerfiTilbod.printOffer(f); else if (f.type === 'samningur') printDoc(samnHtml(f)); else if (f.type === 'serverd') printDoc(serverdHtml(f)); else printDoc(slokkHtml(f)); }
  async function delForm(f) {
    if (!confirm('Eyða þessu formi fyrir "' + (f.customer && f.customer.nafn || '') + '"?')) return;
    if (f.type === 'brunakerfi') { await saveBk(getBk().filter(x => x.id !== f.id)); window.BrunakerfiTilbod && window.BrunakerfiTilbod.refreshSaved(); }
    else await saveHub(getHub().filter(x => x.id !== f.id));
    render();
  }
  // re-render when a Brunakerfi modal (patch 200) closes, so its saves show here
  function afterModal() {
    const mo = new MutationObserver(() => { if (!document.getElementById('_bt-modal')) { mo.disconnect(); setTimeout(render, 60); } });
    mo.observe(document.body, { childList: true });
  }

  // ====================== send focus link ======================
  function toast(msg) { try { if (window.Toast && window.Toast.show) { window.Toast.show(msg); return; } } catch (e) {} const d = document.createElement('div'); d.textContent = msg; d.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:100001;background:#1b1b1b;color:#fff;font:13px Arial;padding:10px 16px;border-radius:10px'; document.body.appendChild(d); setTimeout(() => d.remove(), 3200); }
  async function sendLink() {
    const url = location.origin + location.pathname + '?tab=tilbodhub&fokus=1#view-tilbodhub';
    if (navigator.share) { try { await navigator.share({ title: 'Tilboð & samningar', text: 'Tengill á Tilboð & samningar — opnar aðeins þessa síðu.', url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(url); toast('✓ Tengill afritaður — sendu starfsmanni. Opnar aðeins þessa síðu.'); } catch (e) { prompt('Afritaðu tengilinn og sendu starfsmanni:', url); }
  }

  // ====================== view + nav wiring ======================
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + VIEW + '"]')) return;
    const btns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const after = btns.find(b => /brunakerfi/i.test(b.getAttribute('data-view') || '')) || btns.find(b => /brunakerfis/i.test(b.textContent || '')) || btns[btns.length - 1];
    const tpl = after || btns[0]; if (!tpl) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', VIEW);
    btn.innerHTML = '<span style="margin-right:6px">📑</span>Tilboð &amp; samningar';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); go(); });
    if (after && after.parentNode) after.parentNode.insertBefore(btn, after.nextSibling); else nav.appendChild(btn);
  }
  function go() { if (window.App && App.switchView) App.switchView(VIEW); render(); }

  // re-render whenever this view is shown via App.switchView
  function hookSwitch() {
    if (!window.App || typeof App.switchView !== 'function' || App.__thHooked) { setTimeout(hookSwitch, 400); return; }
    App.__thHooked = true;
    const orig = App.switchView.bind(App);
    App.switchView = function (v) { orig(v); if (v === VIEW) try { render(); } catch (e) {} };
  }

  // focus deep-link: ?tab=tilbodhub[&fokus=1] opens this page (patch 200 hides nav on fokus=1)
  function deepLink() {
    if (!/[?&]tab=tilbodhub/.test(location.search) && !/view-tilbodhub/.test(location.hash || '')) return;
    let tries = 0;
    (function t() { if (document.getElementById('view-' + VIEW) && window.App && App.switchView) { go(); if (/[?&]fokus=1/.test(location.search) && !document.getElementById('_th-fokus-chip')) addChip(); } else if (tries++ < 40) setTimeout(t, 300); })();
  }
  function addChip() {
    const chip = document.createElement('div');
    chip.id = '_th-fokus-chip';
    chip.title = 'Opna allt kerfið';
    chip.style.cssText = 'position:fixed;bottom:10px;left:10px;z-index:90000;background:#1b1b1b;color:#fff;font:12px Arial;padding:6px 11px;border-radius:99px;opacity:.55;cursor:pointer';
    chip.textContent = '🔒 Tilboð & samningar';
    chip.onclick = () => { location.href = location.origin + location.pathname + '?tab=tilbodhub#view-tilbodhub'; };
    document.body.appendChild(chip);
  }

  injectNav();
  hookSwitch();
  document.addEventListener('DOMContentLoaded', () => { injectNav(); deepLink(); });
  setTimeout(() => { injectNav(); deepLink(); }, 900);

  window.TilbodHub = { open: go, render };
})();
