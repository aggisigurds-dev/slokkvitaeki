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
  const fmtDate = iso => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return iso; return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
  const branding = () => (window.AppSettings && window.AppSettings.path && window.AppSettings.path('branding')) || {};
  const BRAND = { black: '#1b1b1b', red: '#C0341D', orange: '#F07A1E' };

  // ---- color themes (rotating button, top-right) ----
  const THEMES = [
    { id: 'fire', name: '🔥 Eldur', dark: '#1b1b1b', primary: '#C0341D', accent: '#F07A1E', tint: '#fbeee7', tintb: '#F07A1E' },
    { id: 'blue', name: '🔵 Business', dark: '#0f2747', primary: '#1d4ed8', accent: '#0ea5e9', tint: '#eff6ff', tintb: '#1d4ed8' },
    { id: 'white', name: '⬜ Hvítt', dark: '#52525b', primary: '#71717a', accent: '#d4d4d8', tint: '#fafafa', tintb: '#e4e4e7' },
    { id: 'grey', name: '◻️ Grátt', dark: '#374151', primary: '#475569', accent: '#94a3b8', tint: '#f1f5f9', tintb: '#94a3b8' },
  ];
  let themeIdx = 0;
  try { const s = localStorage.getItem('th_theme'); const i = THEMES.findIndex(t => t.id === s); if (i >= 0) themeIdx = i; } catch (e) {}
  const theme = () => THEMES[themeIdx];
  function applyTheme() {
    const t = theme(), r = document.documentElement.style;
    r.setProperty('--th-dark', t.dark); r.setProperty('--th-primary', t.primary); r.setProperty('--th-accent', t.accent);
    r.setProperty('--th-tint', t.tint); r.setProperty('--th-tintb', t.tintb);
    r.setProperty('--th-gh', 'linear-gradient(95deg,' + t.dark + ' 0%,' + t.primary + ' 130%)');
    r.setProperty('--th-gb', 'linear-gradient(95deg,' + t.primary + ',' + t.accent + ')');
  }
  function cycleTheme() { themeIdx = (themeIdx + 1) % THEMES.length; try { localStorage.setItem('th_theme', theme().id); } catch (e) {} applyTheme(); render(); toast(theme().name); }

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
      <div style="display:flex;justify-content:space-between;align-items:center;padding:15px 20px;background:var(--th-gh);border-bottom:3px solid var(--th-accent);position:sticky;top:0;border-radius:14px 14px 0 0;z-index:2">
        <h2 style="margin:0;font-size:17px;color:#fff;display:flex;align-items:center;gap:8px">${titleHtml}</h2>
        <button id="_th-x" type="button" style="border:none;background:rgba(255,255,255,.16);border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:18px;color:#fff">×</button>
      </div>
      <div style="padding:18px 20px">${bodyHtml}</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid #e2e8f0;position:sticky;bottom:0;background:#fff;border-radius:0 0 14px 14px">${footHtml}</div>
    </div>`;
    document.body.appendChild(ov);
    // 17.09.2026: leit að fyrirtæki beint úr nafnreitnum — okkar kúnnar (líka eftir
    // heimilisfangi) + fyrirtækjaskrá RSK. Fyllir nafn, kennitölu og heimilisfang.
    // Sjá js/patches/377-fyrirtaekjaleit.js.
    try { if (window.FyrirtaekjaLeit) FyrirtaekjaLeit.tengja('_th-nafn', { kt: '_th-kt', addr: '_th-addr' }); } catch (_) {}
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
            <label style="font-size:11px;color:#64748b;font-weight:700;grid-column:1 / -1">Nánari skil (valfrjálst)<textarea id="_th-skyring" rows="3" placeholder="Það sem á að koma fram í tilboðinu — umfang, fyrirvarar, hvað er innifalið…" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;font-weight:400;color:#0f172a;resize:vertical">${esc(c.skyring || '')}</textarea></label>
    </div>`;
  const readCust = ov => ({ nafn: ov.querySelector('#_th-nafn').value.trim(), kennitala: ov.querySelector('#_th-kt').value.trim(), heimilisfang: ov.querySelector('#_th-addr').value.trim() });
  // 17.09.2026: nánari skil — einn reitur, öll þrjú skjölin (custFields er sameiginlegur).
  const readSkyring = ov => ((ov.querySelector('#_th-skyring') || {}).value || '').trim();
  const footBtns = `<button id="_th-cancel" type="button" style="padding:10px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Loka</button>
    <button id="_th-print" type="button" style="padding:10px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#0f172a;font-weight:700">🖨 Prenta PDF</button>
    <button id="_th-save" type="button" style="padding:10px 20px;border:none;border-radius:8px;background:var(--th-gb);color:#fff;cursor:pointer;font:inherit;font-size:13px;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,.22)">💾 Vista</button>`;

  // ---------- print (A4 sheet, brand) ----------
  // Skráarnafn: Chrome tekur það úr <title>. Skástrik, tvípunktur o.fl. mega ekki
  // fara þangað — kúnnanafn getur borið þau („Húsfélagið A/B").
  const skjalNafn = (hlutar) => hlutar.filter(Boolean)
    .map(s => String(s).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim())
    .filter(Boolean).join(' - ');

  // 17.09.2026: `skjalHeiti` er AÐEINS <title> (og þar með skráarnafnið);
  // `titleBadge` er áfram merkið sem sést á skjalinu sjálfu.
  function docShell(titleBadge, dateStr, custBlock, inner, skjalHeiti, skyring) {
    const b = branding();
    const primary = theme().primary, dark = theme().dark;
    const logo = (b.logo_url || '').trim();
    const head = logo ? `<img src="${esc(logo)}" alt="" style="max-height:56px;max-width:240px">` : `<div style="font-size:24px;font-weight:800;color:${dark}">${esc(b.company_name || 'Slökkvitæki ehf')}</div>`;
    return '<!DOCTYPE html><html lang="is"><head><meta charset="utf-8"><title>' + esc(skjalHeiti || titleBadge) + '</title>' +
      '<style>@page{size:A4;margin:12mm}html,body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#eef1f4}' +
      '.sheet{max-width:760px;margin:22px auto;background:#fff;padding:28px 34px;box-shadow:0 6px 24px rgba(0,0,0,.14);border-radius:5px}' +
      'table{width:100%;border-collapse:collapse}.btn{padding:9px 18px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:700}' +
      '@media print{html,body{background:#fff}.sheet{margin:0;max-width:none;box-shadow:none;border-radius:0;padding:0}.no-print{display:none!important}}</style></head><body><div class="sheet">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ' + primary + ';padding-bottom:10px;margin-bottom:16px">' +
        '<div>' + head + '<div style="font-size:11px;color:#475569;margin-top:8px;line-height:1.4">' +
          (b.address1 ? esc(b.address1) + (b.address2 ? ', ' + esc(b.address2) : '') + '<br>' : '') +
          (b.phone ? 'Sími ' + esc(b.phone) : '') + (b.phone && b.email ? ' · ' : '') + (b.email ? esc(b.email) : '') +
          (b.kennitala ? '<br>kt. ' + esc(b.kennitala) : '') + '</div></div>' +
        '<div style="text-align:right"><div style="display:inline-block;background:' + primary + ';color:#fff;padding:3px 12px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">' + esc(titleBadge) + '</div>' +
          '<div style="font-size:11px;color:#64748b;margin-top:8px">' + esc(dateStr) + '</div></div>' +
      '</div>' + custBlock + inner +
      // 17.09.2026: nánari skil frá Agnari. Tómt gildi prentar ekkert.
      (skyring ? '<div style="margin-top:20px;padding:11px 13px;background:#fbfaf7;border:1px solid #e7e2d7;border-radius:8px;font-size:12px;line-height:1.55;color:#334155;white-space:pre-wrap">' + esc(skyring) + '</div>' : '') +
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
      '<button id="_th-pp" type="button" style="padding:9px 18px;border:none;border-radius:8px;background:var(--th-primary);color:#fff;font-weight:700;cursor:pointer">🖨 Prenta</button>' +
      '<button id="_th-pc" type="button" style="padding:9px 18px;border:none;border-radius:8px;background:#fff;color:#475569;font-weight:700;cursor:pointer">Loka</button></div>' +
      '<iframe id="_th-frame" style="flex:1;border:none;background:#fff;border-radius:10px" sandbox="allow-same-origin allow-modals allow-scripts"></iframe>';
    document.body.appendChild(ov);
    const frame = ov.querySelector('#_th-frame'); frame.srcdoc = html;
    ov.querySelector('#_th-pc').onclick = () => ov.remove();
    ov.querySelector('#_th-pp').onclick = () => {
      // Chrome tekur skráarnafnið úr titli AÐALSKJALSINS, ekki iframe-sins.
      // Við lánum því titilinn á meðan prentað er og skilum honum strax aftur.
      const gamallTitill = document.title;
      let skjalTitill = '';
      try { skjalTitill = (frame.contentDocument && frame.contentDocument.title) || ''; } catch (_) {}
      if (skjalTitill) document.title = skjalTitill;
      let skilad = false;
      const skila = () => { if (skilad) return; skilad = true; document.title = gamallTitill; };
      try { frame.contentWindow.addEventListener('afterprint', skila, { once: true }); } catch (_) {}
      window.addEventListener('afterprint', skila, { once: true });
      setTimeout(skila, 60000);   // öryggisnet: titillinn má aldrei sitja fastur
      try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { skila(); }
    };
  }

  // ====================== SLÖKKVITÆKI TILBOÐ (free lines) ======================
  // Aðal-slökkvitæki (sýnd sjálfgefið): Duft · Léttvatn · Kolsýra (CO₂) — en AÐEINS
  // raunveruleg tæki (nafn inniheldur „slökkvitæki"), ekki gjöld/hleðslur.
  const PRIMARY_RE = /duft|léttvatn|lettvatn|co2|co₂|kolsýr|kolsyr/i;
  const isPrimary = n => PRIMARY_RE.test(n || '') && /sl[öo]kkvit/i.test(n || '');
  async function loadVorur() {
    try {
      if (window.DB && DB.sb) {
        const r = await DB.sb.from('vorur').select('nafn,verd_an_vsk,flokkur,virkt').order('flokkur', { ascending: true }).order('nafn', { ascending: true });
        const arr = (r.data || []).filter(p => p.virkt !== false).map(p => ({ lysing: p.nafn, magn: 0, verd: Math.round(p.verd_an_vsk || 0), afsl: 0, primary: isPrimary(p.nafn) }));
        arr.sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0)); // aðaltæki efst
        return arr;
      }
    } catch (e) {}
    return [];
  }
  async function openSlokk(existing) {
    const o = existing ? JSON.parse(JSON.stringify(existing)) : null;
    const c = Object.assign({}, (o && o.customer) || {}, { _date: (o && o.date) || todayISO(), skyring: (o && o.skyring) || '' });
    // New tilboð: prefill with the live vörur price list (editable); editing: saved lines.
    let lines = (o && o.lines && o.lines.length) ? o.lines.map(l => ({ ...l, primary: true })) : await loadVorur();
    if (!lines.length) lines = [{ lysing: '', magn: 1, verd: 0, afsl: 0, primary: true }];
    let showOthers = false;
    const body = custFields(c) +
      '<div style="overflow:auto;border:1px solid #e2e8f0;border-radius:10px;max-height:40vh"><table><thead><tr style="background:var(--th-tint);border-bottom:2px solid var(--th-tintb)">' +
        '<th style="text-align:left;padding:8px;font-size:10px;color:var(--th-dark);text-transform:uppercase;font-weight:800">Vara / lýsing</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:var(--th-dark);text-transform:uppercase;font-weight:800">Magn</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:var(--th-primary);text-transform:uppercase;font-weight:800">Verð án vsk</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:var(--th-dark);text-transform:uppercase;font-weight:800">Afsl %</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:var(--th-dark);text-transform:uppercase;font-weight:800">Samtals</th><th></th>' +
      '</tr></thead><tbody id="_th-tbody"></tbody></table></div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap">' +
        '<button id="_th-others" type="button" style="padding:7px 12px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;color:#475569;cursor:pointer;font:inherit;font-size:12px;font-weight:700">▾ Sjá aðrar vörur</button>' +
        '<button id="_th-addrow" type="button" style="padding:7px 12px;border:1px dashed var(--th-primary);border-radius:7px;background:#fff;color:var(--th-primary);cursor:pointer;font:inherit;font-size:12px;font-weight:700">+ Bæta við vöru / línu</button>' +
      '</div>' +
      totalsBlock();
    const m = modal('🧯 Slökkvitæki — tilboð' + (o ? ' <span style="font-size:12px;color:#fbbf24;font-weight:400">· breyti</span>' : ''), body, footBtns);
    const ov = m.ov, tbody = ov.querySelector('#_th-tbody');
    function rowHtml(l, i) {
      return `<tr data-i="${i}" data-primary="${l.primary ? 1 : 0}" class="${l.primary ? '' : '_th-other'}">
        <td style="padding:4px 6px"><input data-f="lysing" type="text" value="${esc(l.lysing || '')}" placeholder="Lýsing á vöru / þjónustu" style="width:100%;min-width:220px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;box-sizing:border-box"></td>
        <td style="padding:4px 6px"><input data-f="magn" type="number" min="0" step="1" value="${l.magn != null ? l.magn : 1}" style="width:58px;padding:6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right"></td>
        <td style="padding:4px 6px"><input data-f="verd" type="text" inputmode="numeric" value="${grp(l.verd)}" style="width:92px;padding:6px;border:1px solid var(--th-tintb);border-radius:6px;font:inherit;font-size:12px;text-align:right;font-weight:600;color:var(--th-primary)"></td>
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
      return { skyring: readSkyring(ov), id: (o && o.id) || ('S' + Date.now()), type: 'slokkvitaeki', created_at: (o && o.created_at) || new Date().toISOString(), updated_at: new Date().toISOString(), date: ov.querySelector('#_th-date').value || todayISO(), customer: readCust(ov), lines: ls, total_disc: num(ov.querySelector('#_th-tdisc').value), an_vsk: Math.round(t.an), vsk: Math.round(t.vsk), m_vsk: Math.round(t.m_vsk) };
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
    return docShell('Tilboð', fmtDate(o.date), custPrintBlock(o.customer), inner,
      skjalNafn(['Tilboð', o.customer && o.customer.nafn, 'Slökkvitæki']), o.skyring);
  }

  // ====================== SLÖKKVITÆKI SÉRVERÐ (per-unit, no grand total) ======================
  async function openServerd(existing) {
    const o = existing ? JSON.parse(JSON.stringify(existing)) : null;
    const c = Object.assign({}, (o && o.customer) || {}, { _date: (o && o.date) || todayISO(), skyring: (o && o.skyring) || '' });
    let lines;
    if (o && o.lines && o.lines.length) lines = o.lines.map(l => ({ ...l, primary: true }));
    else {
      const v = await loadVorur(); lines = v.map(p => ({ n: p.lysing, full: Math.round((p.verd || 0) * (1 + VSK)), afsl: 0, include: false, primary: p.primary }));
      // 25.09 (Agnar): „Vill ný slökkvitæki efst almennt … fyrirsögn ný tæki" — sjálfgefin fyrirsögn
      // yfir aðaltækjunum; pakkarnir (418) bæta sínum flokkum við fyrir neðan.
      if (lines.some(l => l.primary)) lines.unshift({ heading: true, h: 'Ný tæki', include: true, primary: true });
    }
    if (!lines.length) lines = [{ n: '', full: 0, afsl: 0, include: true, primary: true }];
    let showOthers = false;
    const inSt = 'padding:6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right';
    const body = custFields(c) +
      '<div style="font-size:11.5px;color:#64748b;margin-bottom:8px">Hakaðu við tækin sem fá sérverð, settu afslátt — sérverð (m.vsk) reiknast per tæki. Ekkert heildarsamtala.</div>' +
      '<div style="overflow:auto;border:1px solid #e2e8f0;border-radius:10px;max-height:46vh"><table><thead><tr style="background:var(--th-tint);border-bottom:2px solid var(--th-tintb)">' +
        '<th style="width:34px"></th>' +
        '<th style="text-align:left;padding:8px;font-size:10px;color:var(--th-dark);text-transform:uppercase;font-weight:800">Tæki / vara</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:var(--th-dark);text-transform:uppercase;font-weight:800">Fullt verð</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:var(--th-dark);text-transform:uppercase;font-weight:800">Afsl %</th>' +
        '<th style="text-align:right;padding:8px;font-size:10px;color:var(--th-primary);text-transform:uppercase;font-weight:800">Sérverð m.vsk</th><th></th>' +
      '</tr></thead><tbody id="_th-tbody"></tbody></table></div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap">' +
        '<button id="_th-others" type="button" style="padding:7px 12px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;color:#475569;cursor:pointer;font:inherit;font-size:12px;font-weight:700">▾ Sjá aðrar vörur</button>' +
        '<button id="_th-addrow" type="button" style="padding:7px 12px;border:1px dashed var(--th-primary);border-radius:7px;background:#fff;color:var(--th-primary);cursor:pointer;font:inherit;font-size:12px;font-weight:700">+ Bæta við tæki / línu</button>' +
      '</div>';
    const m = modal('🏷 Slökkvitæki — sérverð' + (o ? ' <span style="font-size:12px;color:#fbbf24;font-weight:400">· breyti</span>' : ''), body, footBtns);
    const ov = m.ov, tbody = ov.querySelector('#_th-tbody');
    // 25.09.2026 (Agnar: „Ekki láta þetta blandast svona saman. Hafðu að maður geti dregið til, og
    // að geta sett fyrirsögn fyrir ofan hvern flokk á verðlistablaðinu"): FYRIRSAGNARLÍNUR
    // ({ heading:true, h }) skipta listanum í flokka og prentast sem kaflahaus; allar línur eru
    // DRAGANLEGAR á gripinu ⋮⋮. Samningurinn við 418 (pakkarnir): data-heading="1" + [data-f="h"].
    const GRIP = '<span class="_th-grip" title="Draga til" style="cursor:grab;color:#94a3b8;font-size:13px;user-select:none;padding:0 3px;line-height:1">⋮⋮</span>';
    function rowHtml(l, i) {
      if (l.heading) {
        return `<tr data-i="${i}" data-primary="1" data-heading="1" draggable="true" style="background:var(--th-tint)">
        <td style="text-align:center;padding:4px 6px">${GRIP}</td>
        <td colspan="4" style="padding:4px 6px"><input data-f="h" type="text" value="${esc(l.h || '')}" placeholder="Fyrirsögn flokks — t.d. Slökkvitækjaþjónusta" style="width:100%;padding:6px 8px;border:1px solid var(--th-tintb);border-radius:6px;font:inherit;font-size:12.5px;font-weight:800;color:var(--th-dark);background:#fff"></td>
        <td style="padding:4px 6px"><button data-del type="button" style="border:none;background:#fef2f2;color:#dc2626;border-radius:6px;width:26px;height:26px;cursor:pointer">×</button></td>
      </tr>`;
      }
      const fin = (l.full || 0) * (1 - (l.afsl || 0) / 100);
      return `<tr data-i="${i}" data-primary="${l.primary ? 1 : 0}" class="${l.primary ? '' : '_th-other'}" draggable="true" style="${l.include ? 'background:#f0fdf4' : ''}">
        <td style="text-align:center;padding:4px 6px;white-space:nowrap">${GRIP}<input data-f="inc" type="checkbox" ${l.include ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;vertical-align:middle"></td>
        <td style="padding:4px 6px"><input data-f="n" type="text" value="${esc(l.n || '')}" placeholder="Tæki / vara" style="width:100%;min-width:210px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;box-sizing:border-box"></td>
        <td style="padding:4px 6px"><input data-f="full" type="text" inputmode="numeric" value="${grp(l.full)}" style="${inSt};width:94px"></td>
        <td style="padding:4px 6px"><input data-f="afsl" type="number" min="0" max="100" step="1" value="${l.afsl || ''}" placeholder="0" style="${inSt};width:54px"></td>
        <td data-cell="final" style="padding:4px 8px;font-size:12.5px;text-align:right;font-weight:700;color:var(--th-primary);white-space:nowrap">${fmtKr(fin)}</td>
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
      tbody.querySelectorAll('tr').forEach(tr => {
        if (tr.dataset.heading === '1') { out.push({ heading: true, h: (tr.querySelector('[data-f="h"]') || {}).value || '', include: true, primary: true }); return; }
        out.push({ n: tr.querySelector('[data-f="n"]').value.trim(), full: pn(tr.querySelector('[data-f="full"]').value), afsl: num(tr.querySelector('[data-f="afsl"]').value), include: tr.querySelector('[data-f="inc"]').checked, primary: tr.dataset.primary === '1' });
      });
      return out;
    }
    function recompute() {
      const ls = collect();
      tbody.querySelectorAll('tr').forEach((tr, i) => { if (ls[i].heading) return; tr.querySelector('[data-cell="final"]').textContent = fmtKr(ls[i].full * (1 - ls[i].afsl / 100)); tr.style.background = ls[i].include ? '#f0fdf4' : ''; });
    }
    ov.addEventListener('input', e => { if (e.target.tagName === 'INPUT') recompute(); });
    ov.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-f="inc"]')) recompute(); });
    ov.addEventListener('blur', e => { if (e.target.matches && e.target.matches('[data-f="full"]')) e.target.value = grp(pn(e.target.value)); }, true);
    tbody.addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b) { lines = collect(); lines.splice(+b.closest('tr').dataset.i, 1); draw(); } });
    // Ný lína / ný fyrirsögn fara aftast í SÝNILEGA hlutann — á undan földu „öðrum vörum".
    function fyrstaFalda(ls) { const i = ls.findIndex(l => !l.heading && !l.primary); return i < 0 ? ls.length : i; }
    ov.querySelector('#_th-addrow').onclick = () => { lines = collect(); lines.splice(fyrstaFalda(lines), 0, { n: '', full: 0, afsl: 0, include: true, primary: true }); draw(); };
    const addRowBtn = ov.querySelector('#_th-addrow');
    const addHead = document.createElement('button');
    addHead.id = '_th-addhead'; addHead.type = 'button'; addHead.textContent = '+ Fyrirsögn';
    addHead.title = 'Fyrirsögn flokks — prentast sem kaflahaus á verðlistablaðinu';
    addHead.style.cssText = 'padding:7px 12px;border:1px dashed var(--th-dark);border-radius:7px;background:#fff;color:var(--th-dark);cursor:pointer;font:inherit;font-size:12px;font-weight:700';
    addRowBtn.parentNode.insertBefore(addHead, addRowBtn.nextSibling);
    addHead.onclick = () => {
      lines = collect(); const at = fyrstaFalda(lines);
      lines.splice(at, 0, { heading: true, h: '', include: true, primary: true }); draw();
      const inp = tbody.querySelectorAll('tr')[at]?.querySelector('[data-f="h"]'); if (inp) inp.focus();
    };
    ov.querySelector('#_th-others').onclick = () => { showOthers = !showOthers; applyOtherVis(); };
    // ── Draga til (HTML5 DnD á gripinu) ──
    let dragTr = null, gripDown = false;
    tbody.addEventListener('mousedown', e => { gripDown = !!(e.target.closest && e.target.closest('._th-grip')); });
    tbody.addEventListener('dragstart', e => {
      const tr = e.target.closest && e.target.closest('tr');
      if (!tr || !gripDown) { e.preventDefault(); return; }   // aðeins af gripinu — annars stelur það textavali í reitunum
      dragTr = tr; tr.style.opacity = '.45';
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', tr.dataset.i || ''); } catch (_) {}
    });
    tbody.addEventListener('dragover', e => {
      if (!dragTr) return; e.preventDefault();
      const tr = e.target.closest && e.target.closest('tr'); if (!tr || tr === dragTr) return;
      const r = tr.getBoundingClientRect(); const undir = e.clientY > r.top + r.height / 2;
      tbody.querySelectorAll('tr').forEach(x => { x.style.boxShadow = ''; });
      tr.style.boxShadow = undir ? 'inset 0 -2px 0 var(--th-primary)' : 'inset 0 2px 0 var(--th-primary)';
      tr.dataset.dropUndir = undir ? '1' : '0';
    });
    tbody.addEventListener('drop', e => {
      if (!dragTr) return; e.preventDefault();
      const tr = e.target.closest && e.target.closest('tr');
      if (tr && tr !== dragTr) { if (tr.dataset.dropUndir === '1') tr.parentNode.insertBefore(dragTr, tr.nextSibling); else tr.parentNode.insertBefore(dragTr, tr); }
      lines = collect(); dragTr = null; gripDown = false; draw();
    });
    tbody.addEventListener('dragend', () => { if (dragTr) dragTr.style.opacity = ''; dragTr = null; gripDown = false; tbody.querySelectorAll('tr').forEach(x => { x.style.boxShadow = ''; delete x.dataset.dropUndir; }); });
    draw();
    function build() {
      // Fyrirsögn fylgir aðeins með eigi hún hakaða línu undir sér (tóm fyrirsögn prentast ekki).
      const oll = collect().filter(l => l.heading ? !!String(l.h || '').trim() : (l.include && l.n));
      const ls = oll.filter((l, i) => !l.heading || (oll[i + 1] && !oll[i + 1].heading));
      return { skyring: readSkyring(ov), id: (o && o.id) || ('V' + Date.now()), type: 'serverd', created_at: (o && o.created_at) || new Date().toISOString(), updated_at: new Date().toISOString(), date: ov.querySelector('#_th-date').value || todayISO(), customer: readCust(ov), lines: ls, m_vsk: 0 };
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
    const tp = theme().primary;
    const rows = o.lines.map(l => { if (l.heading) return '<tr><td colspan="4" style="padding:14px 9px 5px;font-size:11.5px;font-weight:800;color:' + tp + ';text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid ' + tp + '">' + esc(l.h) + '</td></tr>';
      const fin = l.full * (1 - (l.afsl || 0) / 100); return '<tr>' +
      '<td style="padding:7px 9px;font-size:12px;border-bottom:1px solid #f1f5f9">' + esc(l.n) + '</td>' +
      '<td style="padding:7px 9px;font-size:12px;text-align:right;border-bottom:1px solid #f1f5f9;color:#94a3b8;text-decoration:' + (l.afsl ? 'line-through' : 'none') + '">' + fmtKr(l.full) + '</td>' +
      '<td style="padding:7px 9px;font-size:12px;text-align:right;border-bottom:1px solid #f1f5f9">' + (l.afsl ? l.afsl + '%' : '—') + '</td>' +
      '<td style="padding:7px 9px;font-size:13px;text-align:right;font-weight:800;color:' + tp + ';border-bottom:1px solid #f1f5f9">' + fmtKr(fin) + '</td></tr>'; }).join('');
    const inner = '<div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px">Sérverð á slökkvitækjum — verð m. vsk</div>' +
      '<table><thead><tr style="background:#f8fafc">' +
        '<th style="text-align:left;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Tæki / vara</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Fullt verð</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Afsláttur</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Sérverð</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div style="margin-top:20px;font-size:11px;color:#64748b">Verð eru m. vsk og gilda á meðan samningur er í gildi. Ekkert heildarverð — verð per tæki.</div>';
    return docShell('Sérverð', fmtDate(o.date), custPrintBlock(o.customer), inner,
      skjalNafn(['Sérverð', o.customer && o.customer.nafn, 'Slökkvitæki']), o.skyring);
  }

  // ====================== ÞJÓNUSTUSAMNINGUR ======================
  function openSamn(existing) {
    const o = existing ? JSON.parse(JSON.stringify(existing)) : null;
    const c = Object.assign({}, (o && o.customer) || {}, { _date: (o && o.date) || todayISO(), skyring: (o && o.skyring) || '' });
    const d = o || {};
    const inp = (id, val, ph) => `<input id="${id}" type="text" value="${esc(val || '')}" placeholder="${esc(ph || '')}" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box">`;
    const body = custFields(c) +
      '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-bottom:12px">' +
        '<label style="font-size:11px;color:#64748b;font-weight:700">Þjónusta' + inp('_th-thjon', d.thjonusta || 'Árleg skoðun og þjónusta slökkvitækja og brunakerfa', '') + '</label>' +
        '<label style="font-size:11px;color:#64748b;font-weight:700">Verð án vsk / ár<input id="_th-verd" type="text" inputmode="numeric" value="' + grp(d.verd || 0) + '" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid var(--th-tintb);border-radius:7px;font:inherit;font-size:13px;font-weight:600;color:var(--th-primary);box-sizing:border-box"></label>' +
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
        '<div style="display:flex;justify-content:space-between;padding:9px 0;font-size:17px;font-weight:800;color:var(--th-primary);border-top:3px solid var(--th-dark);margin-top:4px"><span>Samtals m. vsk / ár</span><span id="_th-s-tot">—</span></div>' +
      '</div></div>';
    const m = modal('📜 Þjónustusamningur' + (o ? ' <span style="font-size:12px;color:#fbbf24;font-weight:400">· breyti</span>' : ''), body, footBtns);
    const ov = m.ov;
    function recompute() { const an = pn(ov.querySelector('#_th-verd').value); ov.querySelector('#_th-s-an').textContent = fmtKr(an); ov.querySelector('#_th-s-vsk').textContent = fmtKr(an * VSK); ov.querySelector('#_th-s-tot').textContent = fmtKr(an * (1 + VSK)); }
    ov.addEventListener('input', recompute);
    ov.addEventListener('blur', e => { if (e.target.id === '_th-verd') e.target.value = grp(pn(e.target.value)); }, true);
    recompute();
    function build() {
      const an = pn(ov.querySelector('#_th-verd').value);
      return { skyring: readSkyring(ov), id: (o && o.id) || ('M' + Date.now()), type: 'samningur', created_at: (o && o.created_at) || new Date().toISOString(), updated_at: new Date().toISOString(), date: ov.querySelector('#_th-date').value || todayISO(), customer: readCust(ov), thjonusta: ov.querySelector('#_th-thjon').value.trim(), tidni: ov.querySelector('#_th-tidni').value.trim(), gildir_fra: ov.querySelector('#_th-fra').value, uppsogn: ov.querySelector('#_th-upps').value.trim(), skilmalar: ov.querySelector('#_th-skilm').value.trim(), verd: an, an_vsk: Math.round(an), vsk: Math.round(an * VSK), m_vsk: Math.round(an * (1 + VSK)) };
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
    const tp = theme().primary, tdk = theme().dark;
    const row = (k, v) => '<tr><td style="padding:6px 9px;font-size:12px;color:#64748b;width:38%">' + esc(k) + '</td><td style="padding:6px 9px;font-size:12px;font-weight:600">' + v + '</td></tr>';
    const inner = '<table style="margin-bottom:14px">' +
        row('Þjónusta', esc(o.thjonusta || '')) + row('Tíðni', esc(o.tidni || '')) +
        row('Gildir frá', esc(fmtDate(o.gildir_fra))) + row('Uppsagnarfrestur', esc(o.uppsogn || '')) +
        row('Verð án vsk / ár', fmtKr(o.an_vsk)) + row('VSK 24%', fmtKr(o.vsk)) +
        row('Samtals m. vsk / ár', '<span style="color:' + tp + ';font-weight:800">' + fmtKr(o.m_vsk) + '</span>') +
      '</table>' +
      '<div style="font-size:11px;font-weight:700;color:' + tdk + ';margin:14px 0 4px;text-transform:uppercase;letter-spacing:.04em">Skilmálar</div>' +
      '<div style="font-size:12px;line-height:1.55;color:#0f172a;white-space:pre-wrap">' + esc(o.skilmalar || '') + '</div>' +
      '<div style="display:flex;justify-content:space-between;gap:40px;margin-top:40px">' +
        '<div style="flex:1;border-top:1px solid ' + tdk + ';padding-top:6px;font-size:11px;color:#64748b">Verktaki</div>' +
        '<div style="flex:1;border-top:1px solid ' + tdk + ';padding-top:6px;font-size:11px;color:#64748b">Viðskiptavinur</div>' +
      '</div>';
    return docShell('Þjónustusamningur', fmtDate(o.date), custPrintBlock(o.customer), inner,
      skjalNafn(['Þjónustusamningur', o.customer && o.customer.nafn, 'Slökkvitæki']), o.skyring);
  }

  // ---------- totals helpers (shared) ----------
  // 17.09.2026: brúttó og línuafsláttur reiknuð sér svo hægt sé að SÝNA afsláttinn.
  // Reikningurinn sjálfur er óbreyttur — `sub` er áfram nettó eftir línuafslátt.
  function totals(lines, td) {
    let brutto = 0, sub = 0;
    lines.forEach(l => { const b = num(l.magn) * num(l.verd); brutto += b; sub += b * (1 - num(l.afsl) / 100); });
    const d = Math.max(0, Math.min(100, num(td)));
    const an = sub * (1 - d / 100);
    return { brutto, lina: brutto - sub, sub, disc: sub - an, an, vsk: an * VSK, m_vsk: an * (1 + VSK) };
  }
  function totalsBlock() {
    return '<div style="display:flex;justify-content:flex-end;margin-top:14px"><div style="min-width:320px">' +
      '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#475569"><span>Samtals án vsk (fyrir afslátt)</span><span id="_th-brutto">—</span></div>' +
      '<div id="_th-linarod" style="display:none;justify-content:space-between;padding:5px 0;font-size:13px;color:#475569"><span>Afsláttur á línum</span><span id="_th-lina" style="color:#dc2626">—</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#475569;border-top:1px solid #e2e8f0"><span>Samtals án vsk</span><span id="_th-sub">—</span></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px;color:#475569"><span>Heildarafsláttur</span><span><input id="_th-tdisc" type="number" min="0" max="100" step="1" value="" placeholder="0" style="width:56px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right"> % <span id="_th-disc" style="margin-left:8px;color:#dc2626"></span></span></div>' +
      '<div id="_th-anrod" style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#475569;border-top:1px solid #e2e8f0"><span>Án vsk eftir afslátt</span><span id="_th-an">—</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#475569"><span>VSK 24%</span><span id="_th-vsk">—</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:9px 0;font-size:18px;font-weight:800;color:var(--th-primary);border-top:3px solid var(--th-dark);margin-top:4px"><span>Samtals m. vsk</span><span id="_th-tot">—</span></div>' +
      '</div></div>';
  }
  function paintTotals(ov, lines) { const t = totals(lines, pn(ov.querySelector('#_th-tdisc').value));
    // 17.09.2026: línuafslátturinn sýndur sér — hann var áður þagður inn í `sub`.
    const b = ov.querySelector('#_th-brutto'); if (b) b.textContent = fmtKr(t.brutto);
    const li = ov.querySelector('#_th-lina'); if (li) li.textContent = t.lina > 0 ? '− ' + fmtKr(t.lina) : '—';
    const lr = ov.querySelector('#_th-linarod'); if (lr) lr.style.display = t.lina > 0 ? 'flex' : 'none';
    // „Án vsk eftir afslátt" endurtekur „Samtals án vsk" nema heildarafsláttur sé settur.
    const ar = ov.querySelector('#_th-anrod'); if (ar) ar.style.display = t.disc > 0 ? 'flex' : 'none';
    ov.querySelector('#_th-sub').textContent = fmtKr(t.sub); ov.querySelector('#_th-disc').textContent = t.disc > 0 ? '− ' + fmtKr(t.disc) : ''; ov.querySelector('#_th-an').textContent = fmtKr(t.an); ov.querySelector('#_th-vsk').textContent = fmtKr(t.vsk); ov.querySelector('#_th-tot').textContent = fmtKr(t.m_vsk); }
  function totRows(t, td) { const tp = theme().primary, tdk = theme().dark; const r = (l, v, big) => '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:' + (big ? ('17px;font-weight:800;border-top:2px solid ' + tdk + ';color:' + tp + ';margin-top:4px;padding-top:8px') : '12.5px;color:#475569') + '"><span>' + l + '</span><span>' + v + '</span></div>'; return '<div style="display:flex;justify-content:flex-end;margin-top:16px"><div style="min-width:300px">' + (t.lina > 0 ? r('Samtals án vsk (fyrir afslátt)', fmtKr(t.brutto)) + r('Afsláttur á línum', '− ' + fmtKr(t.lina)) : '') + r('Samtals án vsk', fmtKr(t.sub)) + (t.disc > 0 ? r('Heildarafsláttur (' + td + '%)', '− ' + fmtKr(t.disc)) : '') + (t.disc > 0 ? r('Án vsk eftir afslátt', fmtKr(t.an)) : '') + r('VSK 24%', fmtKr(t.vsk)) + r('Samtals m. vsk', fmtKr(t.m_vsk), true) + '</div></div>'; }

  // ====================== PAGE RENDER ======================
  // B53 (01.10.2026): síðan í Brunastáli C — plötur í stað pastel-pilla, engin emoji (sjá thStil() hér að neðan).
  const TYPE_META = {
    brunakerfi: { label: 'Brunaviðvörunarkerfi', stutt: 'Brunakerfi', plata: 'rautt' },
    slokkvitaeki: { label: 'Slökkvitæki', stutt: 'Slökkvitæki', plata: 'malmur' },
    serverd: { label: 'Sérverð', stutt: 'Sérverð', plata: 'silfur' },
    samningur: { label: 'Þjónustusamningur', stutt: 'Samningar', plata: 'gull' },
  };
  const TH_ICON = {
    plus: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 2.5v11M2.5 8h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
    edit: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M10.8 2.4l2.8 2.8-8 8H2.8v-2.8z M9.4 3.8l2.8 2.8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>',
    print: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M4.5 6V2.5h7V6M4.5 11.5H2.5v-5h11v5h-2M4.5 9.5h7v4h-7z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" fill="none"/></svg>',
    del: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9M6.8 7v4.5M9.2 7v4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
    send: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2 8l12-5.5L10 14l-2-4.5z M8 9.5l6-7" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" fill="none"/></svg>',
    sheet: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 1.5h7l3 3v10H3z M3 6.5h10M3 10.5h10M7 6.5v8" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" fill="none"/></svg>',
    leit: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  };
  // Síunarval er útlitsval eins vafra (ekki staða gagna) — breyta í minni, ekki á þjóni.
  let thSia = 'allt', thLeit = '';
  function thStil() {
    if (document.getElementById('_th-b53')) return;
    const MONO = '"JetBrains Mono",ui-monospace,monospace', SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif', DISPLAY = '"Playfair Display",Georgia,serif';
    const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
    const METAL_BTN = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
    const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
    const GULL = 'linear-gradient(145deg,#171001 0%,#3d2b05 20%,#8a6410 43%,#d3ab4e 53%,#5a3f07 74%,#171001 100%)';
    const BSTAL = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';
    const RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
    const TS = 'text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)';
    const S = 'html body #view-tilbodhub', F = ':not(#_p201a):not(#_p201b):not(#_p201c)';
    const r = (sel, css) => sel.split(',').map(s => { s = s.trim(); const m = s.match(/^(.*?)(::?(?:before|after|placeholder))$/); return S + ' ' + (m ? m[1] + F + m[2] : s + F); }).join(',') + '{' + css.split(';').map(d => d.trim()).filter(Boolean).map(d => /!important$/.test(d) ? d : d + '!important').join(';') + '}';
    const hnod = (x, y) => 'content:"";position:absolute;' + x + ';' + y + ';width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);pointer-events:none';
    const btnSilfur = 'background:' + SILVER + ';border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530;text-shadow:none;border-radius:4px;font-family:' + SANS + ';font-weight:600';
    const css = [
      r('.th-wrap', 'max-width:1180px;margin:0 auto;padding:18px 18px 60px;font-family:' + SANS + ';color:#141822;box-sizing:border-box'),
      // ── málmhausinn ──
      r('.th-haus', 'position:relative;background:' + METAL + ';background-color:#0a0a0c;border:1px solid #000;border-radius:10px;padding:20px 30px 18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 30px 60px -24px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3);color:#fff;margin:0 0 14px'),
      r('.th-haus::before', hnod('left:10px', 'top:10px')), r('.th-haus::after', hnod('right:10px', 'top:10px')),
      r('.th-hnod-n::before', hnod('left:10px', 'bottom:10px')), r('.th-hnod-n::after', hnod('right:10px', 'bottom:10px')),
      r('.th-hnod-n', 'position:absolute;inset:0;pointer-events:none'),
      r('.th-efst', 'position:relative;display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap'),
      r('.th-kick', 'font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#d3ab4e;margin:0 0 6px'),
      r('.th-haus h1', 'margin:0;font-family:' + DISPLAY + ';font-size:30px;font-weight:800;line-height:1.1;color:#fff;-webkit-text-fill-color:#fff;letter-spacing:-.01em;' + TS),
      r('.th-undir', 'margin-top:6px;font-family:' + MONO + ';font-size:12px;letter-spacing:.04em;color:#c9d0da;-webkit-text-fill-color:#c9d0da'),
      r('.th-haustakkar', 'display:flex;gap:8px;align-items:center;flex-wrap:wrap'),
      r('.th-haustakkar button', btnSilfur + ';height:34px;padding:0 13px;font-size:12.5px;display:inline-flex;align-items:center;gap:7px;cursor:pointer'),
      r('.th-haustakkar button small', 'font-family:' + MONO + ';font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#5b6472'),
      // teljararnir — smellur síar listann
      r('.th-teljarar', 'position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px'),
      r('.th-telj', 'all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:3px;padding:11px 14px 12px;border-radius:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);box-shadow:inset 0 1px 0 rgba(255,255,255,.06);transition:background .15s,border-color .15s;min-width:0'),
      r('.th-telj:hover', 'background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.2)'),
      r('.th-telj.on', 'background:rgba(211,171,78,.12);border-color:rgba(211,171,78,.65);box-shadow:inset 0 0 0 1px rgba(211,171,78,.35),0 0 18px -6px rgba(211,171,78,.6)'),
      r('.th-telj .tl-m', 'display:flex;align-items:center;gap:7px;font-family:' + MONO + ';font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#a9b1bf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'),
      r('.th-telj .tl-d', 'width:8px;height:8px;border-radius:2px;flex:0 0 auto;box-shadow:0 0 0 1px rgba(0,0,0,.5)'),
      r('.th-telj .tl-t', 'font-family:' + DISPLAY + ';font-size:26px;font-weight:800;line-height:1.05;color:#fff;-webkit-text-fill-color:#fff;font-variant-numeric:tabular-nums;' + TS),
      r('.th-telj .tl-u', 'font-family:' + MONO + ';font-size:11px;color:#c9d0da;-webkit-text-fill-color:#c9d0da;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'),
      // ── aðgerðaplatan: nýtt-takkar + verðskrá ──
      r('.th-plata', 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;margin:0 0 16px;border-radius:8px;background-color:#eef1f6;background-image:linear-gradient(180deg,rgba(255,255,255,.9),rgba(20,30,60,.05)),repeating-linear-gradient(108deg,rgba(255,255,255,.5) 0 1px,transparent 1px 4px);border:1px solid rgba(20,24,34,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 2px 6px rgba(10,14,22,.1)'),
      r('.th-ny', 'background:' + BSTAL + ';border:1px solid rgba(190,32,28,.55);color:#fff;box-shadow:0 0 16px -4px rgba(160,16,16,.55),inset 0 1px 0 rgba(255,255,255,.16);text-shadow:0 1px 1px rgba(0,0,0,.55);border-radius:4px;font-family:' + SANS + ';font-weight:700;font-size:13px;height:40px;padding:0 16px;display:inline-flex;align-items:center;gap:8px;cursor:pointer;white-space:nowrap'),
      r('.th-ny:hover', 'filter:brightness(1.15)'),
      r('.th-ny svg', 'opacity:.9'),
      r('.th-verdskra', btnSilfur + ';margin-left:auto;height:40px;padding:0 14px;display:inline-flex;align-items:center;gap:9px;text-decoration:none;font-size:13px;white-space:nowrap'),
      r('.th-verdskra small', 'font-family:' + MONO + ';font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8a6410'),
      // ── listinn ──
      r('.th-listhaus', 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 8px'),
      // fyrirsögnin stendur á gráa stálinu undir dökka bandinu (ekki á plötu) — ljós, eins og 409-undirlínan
      r('.th-listhaus h2', 'margin:0;font-family:' + MONO + ';font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#f1f3f6;-webkit-text-fill-color:#f1f3f6;text-shadow:0 1px 2px rgba(0,0,0,.6)'),
      r('.th-listhaus h2 span', 'color:#e8c873;-webkit-text-fill-color:#e8c873;margin-left:8px'),
      r('.th-leit', 'position:relative;display:flex;align-items:center'),
      r('.th-leit svg', 'position:absolute;left:10px;color:#5b6472;pointer-events:none'),
      r('.th-leit input', 'width:260px;max-width:100%;height:34px;padding:0 12px 0 30px;background:#eef1f6;color:#141822;border:1px solid rgba(20,24,34,.14);border-radius:4px;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);font-family:' + SANS + ';font-size:13px;box-sizing:border-box'),
      r('.th-listi', 'display:flex;flex-direction:column;gap:6px'),
      r('.th-row', 'display:grid;grid-template-columns:150px minmax(0,1fr) auto auto;align-items:center;gap:14px;padding:10px 12px 10px 14px;background:#fff;border:0;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.12);transition:box-shadow .15s'),
      r('.th-row:hover', 'box-shadow:inset 0 0 0 1px rgba(20,24,34,.22),0 4px 10px -2px rgba(10,14,22,.2)'),
      r('.th-plotu', 'justify-self:start;display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:3px;font-family:' + MONO + ';font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;border:1px solid rgba(20,24,34,.12)'),
      r('.th-plotu.rautt', 'background:' + BSTAL + ';border-color:rgba(190,32,28,.55);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.55)'),
      r('.th-plotu.malmur', 'background:' + METAL_BTN + ';border-color:#000;color:#eef1f4;text-shadow:0 1px 1px rgba(0,0,0,.4)'),
      r('.th-plotu.silfur', 'background:' + SILVER + ';color:#11141c;box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12)'),
      r('.th-plotu.gull', 'background:' + GULL + ';border-color:rgba(190,150,60,.5);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5)'),
      r('.th-nafn', 'font-size:14px;font-weight:700;color:#11141c;-webkit-text-fill-color:#11141c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'),
      r('.th-meta', 'margin-top:2px;font-family:' + MONO + ';font-size:11px;color:#5b6472;-webkit-text-fill-color:#5b6472;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'),
      r('.th-upph', 'font-family:' + DISPLAY + ';font-size:17px;font-weight:800;color:#11141c;-webkit-text-fill-color:#11141c;font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right'),
      r('.th-upph.sv', 'font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#5b6472;-webkit-text-fill-color:#5b6472'),
      r('.th-akt', 'display:flex;gap:6px'),
      r('.th-akt button', btnSilfur + ';width:34px;height:34px;padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;min-height:0'),
      r('.th-akt button:hover', 'filter:brightness(.96)'),
      r('.th-akt button[data-act="del"]', 'color:#b42318'),
      r('.th-tomt', 'padding:26px;text-align:center;font-family:' + MONO + ';font-size:12px;letter-spacing:.06em;color:#5b6472;background:#fff;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12)'),
      // ── sími ──
      '@media (max-width:760px){' + [
        r('.th-wrap', 'padding:10px 10px 40px'),
        r('.th-haus', 'padding:16px 18px 14px'),
        r('.th-haus h1', 'font-size:25px'),
        r('.th-telj .tl-vsk', 'display:none'),
        r('.th-teljarar', 'grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px'),
        r('.th-telj .tl-t', 'font-size:22px'),
        r('.th-ny', 'flex:1 1 calc(50% - 10px);justify-content:center;padding:0 10px;font-size:12.5px;min-height:44px'),
        r('.th-verdskra', 'flex:1 1 100%;margin-left:0;justify-content:center;min-height:44px'),
        r('.th-leit', 'flex:1 1 100%'), r('.th-leit input', 'width:100%;height:40px'),
        r('.th-row', 'grid-template-columns:minmax(0,1fr) auto;gap:6px 10px;padding:10px 12px'),
        r('.th-plotu', 'grid-column:1;grid-row:1'),
        r('.th-upph', 'grid-column:2;grid-row:1'),
        r('.th-row > .th-mid', 'grid-column:1 / -1;grid-row:2'),
        r('.th-akt', 'grid-column:1 / -1;grid-row:3;justify-content:flex-end'),
        r('.th-akt button', 'width:44px;height:40px'),
      ].join('') + '}',
    ].join('\n');
    const st = document.createElement('style'); st.id = '_th-b53'; st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }
  function allForms() {
    const hub = getHub().map(f => ({ ...f }));
    const bk = getBk().map(f => ({ ...f, type: 'brunakerfi' }));
    return hub.concat(bk).sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''));
  }
  function render() {
    const main = document.getElementById('tilbodhub-main'); if (!main) return;
    applyTheme(); thStil();
    const forms = allForms();
    // teljarar: fjöldi + samtala m. vsk per tegund (sérverð hefur enga upphæð)
    const telj = { brunakerfi: { n: 0, s: 0 }, slokkvitaeki: { n: 0, s: 0 }, serverd: { n: 0, s: 0 }, samningur: { n: 0, s: 0 } };
    forms.forEach(f => { const t = telj[f.type] || telj.slokkvitaeki; t.n++; t.s += num(f.m_vsk); });
    const DOT = { rautt: '#971515', malmur: '#3d4048', silfur: '#e3e7ee', gull: '#d3ab4e' };
    const teljari = k => { const tm = TYPE_META[k], t = telj[k];
      const u = k === 'serverd' ? (t.n === 1 ? 'verðlisti' : 'verðlistar') : (t.n ? fmtKr(t.s) + '<span class="tl-vsk"> m. vsk</span>' : '—');
      return `<button type="button" class="th-telj${thSia === k ? ' on' : ''}" data-sia="${k}" aria-pressed="${thSia === k}"><span class="tl-m"><span class="tl-d" style="background:${DOT[tm.plata]}"></span>${tm.stutt}</span><span class="tl-t">${t.n}</span><span class="tl-u">${u}</span></button>`; };
    const ny = (id, t) => `<button id="${id}" type="button" class="th-ny">${TH_ICON.plus}${t}</button>`;
    main.innerHTML = `<div class="th-wrap">
      <div class="th-haus"><span class="th-hnod-n"></span>
        <div class="th-efst">
          <div><div class="th-kick">Sala · Tilboð</div><h1>Tilboð &amp; samningar</h1>
            <div class="th-undir">Tilboðs- og samningsform — vistast og samhæfast milli ykkar.</div></div>
          <div class="th-haustakkar">
            <button id="_th-theme" type="button" title="Skipta um lit á prentuðum skjölum"><small>Prentlitur</small>${esc(theme().name)}</button>
            <button id="_th-send" type="button" title="Senda starfsmanni tengil sem opnar AÐEINS þessa síðu">${TH_ICON.send}Senda starfsmanni</button>
          </div>
        </div>
        <div class="th-teljarar">${['brunakerfi', 'slokkvitaeki', 'serverd', 'samningur'].map(teljari).join('')}</div>
      </div>
      <div class="th-plata">
        ${ny('_th-new-bk', 'Brunakerfi-tilboð')}
        ${ny('_th-new-sl', 'Slökkvitæki-tilboð')}
        ${ny('_th-new-sv', 'Sérverð')}
        ${ny('_th-new-mn', 'Þjónustusamningur')}
        <a class="th-verdskra" href="https://docs.google.com/spreadsheets/d/1g36r9NL8bcKZOweav4NSRy0rl6zTdhVY/edit?usp=sharing&ouid=104349985258847227699&rtpof=true&sd=true" target="_blank" rel="noopener" title="Opna tengt verðskrár-/vöruskjal í Google Sheets">${TH_ICON.sheet}Verðskrá<small>Google Sheet ↗</small></a>
      </div>
      <div class="th-listhaus"><h2>Vistuð form<span id="_th-fjoldi"></span></h2>
        <label class="th-leit">${TH_ICON.leit}<input id="_th-leit" type="search" placeholder="Leita að viðskiptavini…" value="${esc(thLeit)}" autocomplete="off"></label></div>
      <div class="th-listi" id="_th-listi"></div>
    </div>`;
    const teiknaLista = () => {
      const q = thLeit.trim().toLowerCase();
      const syn = forms.filter(f => (thSia === 'allt' || f.type === thSia) && (!q || String(f.customer && f.customer.nafn || '').toLowerCase().includes(q) || String(f.customer && f.customer.kt || '').includes(q)));
      main.querySelector('#_th-fjoldi').textContent = syn.length === forms.length ? '· ' + forms.length : '· ' + syn.length + ' af ' + forms.length;
      const L = main.querySelector('#_th-listi');
      L.innerHTML = syn.length ? syn.map(rowFor).join('') : `<div class="th-tomt">${forms.length ? 'Ekkert form passar við síuna.' : 'Engin form enn — búðu til hér að ofan.'}</div>`;
      syn.forEach(f => {
        const row = L.querySelector('.th-row[data-id="' + f.id + '"][data-type="' + f.type + '"]'); if (!row) return;
        row.querySelector('[data-act="edit"]').onclick = () => editForm(f);
        row.querySelector('[data-act="print"]').onclick = () => printForm(f);
        row.querySelector('[data-act="del"]').onclick = () => delForm(f);
      });
    };
    teiknaLista();
    main.querySelectorAll('.th-telj').forEach(b => b.onclick = () => {
      thSia = thSia === b.dataset.sia ? 'allt' : b.dataset.sia;
      main.querySelectorAll('.th-telj').forEach(x => { const on = x.dataset.sia === thSia; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      teiknaLista();
    });
    main.querySelector('#_th-leit').oninput = e => { thLeit = e.target.value; teiknaLista(); };
    main.querySelector('#_th-new-bk').onclick = () => { if (window.BrunakerfiTilbod) { window.BrunakerfiTilbod.open(); afterModal(); } else alert('Brunakerfi-tilboð ekki tiltækt'); };
    main.querySelector('#_th-new-sl').onclick = () => openSlokk();
    main.querySelector('#_th-new-sv').onclick = () => openServerd();
    main.querySelector('#_th-new-mn').onclick = () => openSamn();
    main.querySelector('#_th-send').onclick = sendLink;
    main.querySelector('#_th-theme').onclick = cycleTheme;
  }
  function rowFor(f) {
    const tm = TYPE_META[f.type] || TYPE_META.slokkvitaeki;
    const sub = f.type === 'samningur' ? esc(f.thjonusta || '') : ((f.lines ? f.lines.filter(l => !l.heading).length : 0) + (f.type === 'serverd' ? ' tæki' : ' liðir'));
    const amount = f.type === 'serverd' ? '<div class="th-upph sv">Sérverð</div>' : '<div class="th-upph">' + fmtKr(f.m_vsk) + '</div>';
    return `<div class="th-row" data-id="${esc(f.id)}" data-type="${f.type}">
      <span class="th-plotu ${tm.plata}" title="${tm.label}">${tm.label}</span>
      <div class="th-mid" style="min-width:0"><div class="th-nafn">${esc(f.customer && f.customer.nafn || '—')}</div>
        <div class="th-meta">${esc(fmtDate(f.date))} · ${sub}</div></div>
      ${amount}
      <div class="th-akt">
        <button data-act="edit" type="button" title="Breyta" aria-label="Breyta">${TH_ICON.edit}</button>
        <button data-act="print" type="button" title="Prenta PDF" aria-label="Prenta PDF">${TH_ICON.print}</button>
        <button data-act="del" type="button" title="Eyða" aria-label="Eyða">${TH_ICON.del}</button>
      </div>
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

  applyTheme();
  injectNav();
  hookSwitch();
  document.addEventListener('DOMContentLoaded', () => { injectNav(); deepLink(); });
  setTimeout(() => { injectNav(); deepLink(); }, 900);

  window.TilbodHub = { open: go, render };
})();
