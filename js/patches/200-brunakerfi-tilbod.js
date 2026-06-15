/* === BRUNAKERFI TILBOÐ (offer calculator) v1 ===
   Verðútreikningur / tilboð fyrir brunaviðvörunarkerfi, opnað af "📋 Tilboð"
   hnappnum á Brunakerfisþjónustu (patch 147).

   • Verðskrá brunaviðvörunarkerfa (skoðunarliðir) — verð ÁN vsk.
   • Hver lína: magn × einingaverð (án vsk) − afsláttur% = línusamtals.
   • Heildarafsláttur% + VSK 24% → samtals m. vsk.
   • Slá inn viðskiptavin, Brunahólf/Slökkvitæki logo eins og önnur tilboð.
   • Vista → geymt í AppSettings.brunakerfi_tilbod (samhæft milli tækja) og
     birtist sem endur-breytanlegt tilboð neðst á síðunni.
   • Prenta PDF (iframe + window.print).
*/
(() => {
  if (window.BrunakerfiTilbod) return;

  const KEY = 'brunakerfi_tilbod';
  const VSK = 0.24;

  // Verð ÁN vsk (ISK) — úr Verðskrá brunaviðvörunarkerfa.
  const PRICE_LIST = [
    ['Samantekt og gerð skoðunarskýrslu', 16670],
    ['Skoðun á aðalafli og varaafli', 1210],
    ['Skoðun á aðalstöð brunaviðvörunarkerfis', 10080],
    ['Skoðun á bjöllum / sírenum', 1210],
    ['Skoðun á boðbúnaði / úthringibúnaði', 4040],
    ['Skoðun á gaumljósi', 1210],
    ['Skoðun á geislaskynjara', 15190],
    ['Skoðun á handboðum', 1210],
    ['Skoðun á hitaskynjunarstreng', 9810],
    ['Skoðun á inngangsstýringu fyrir úðakerfi', 2020],
    ['Skoðun á logaskynjurum', 1750],
    ['Skoðun á NH3 (ammóníak) skynjara', 15190],
    ['Skoðun á prentarabúnaði', 950],
    ['Skoðun á rakaþéttum handboðum', 1480],
    ['Skoðun á reyk- hitaskynjurum 6-9m hæð', 2020],
    ['Skoðun á reyk- hitaskynjurum að 6m hæð', 1210],
    ['Skoðun á reyk- hitaskynjurum yfir 9m hæð', 4040],
    ['Skoðun á reyklosunarstöð', 10080],
    ['Skoðun á reyksogsop í reyksogskerfi', 4040],
    ['Skoðun á reyksogsstöð', 10080],
    ['Skoðun á segullæsingu', 1210],
    ['Skoðun á skynjara ofan lofts', 4040],
    ['Skoðun á stjórnstöð slökkvikerfis', 10080],
    ['Skoðun á stokkaskynjara', 8740],
    ['Skoðun á stýrieiningum fyrir inn- og útgangsmerki', 2020],
    ['Skoðun á útgangsstýringu fyrir glugga', 2020],
    ['Skoðun á útgangsstýringu fyrir hurðaaflæsingar', 2020],
    ['Skoðun á útgangsstýringu fyrir loftræsingu', 2020],
    ['Skoðun á útgangsstýringu fyrir reyklúgur', 2020],
    ['Skoðun á útgangsstýringu fyrir reyksog', 2020],
    ['Skoðun á útstöð brunaviðvörunakerfis', 2420],
    ['Skoðun á viðvörunarsökkli með sírenu', 680],
    ['Skoðun á yfilitsmynd og þjónustubók', 1750],
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtKr(n) {
    const v = Math.round(Number(n) || 0);
    return v.toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return iso;
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  }
  const branding = () => (window.AppSettings && window.AppSettings.path && window.AppSettings.path('branding')) || {};
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };

  function getOffers() {
    const a = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(KEY)) || [];
    return Array.isArray(a) ? a.slice() : [];
  }
  async function saveOffers(arr) {
    if (!window.AppSettings || !window.AppSettings.save) { alert('Vista ekki tiltæk (AppSettings vantar)'); return false; }
    return await window.AppSettings.save({ [KEY]: arr });
  }

  // ---- compute totals from a list of {magn, verd, afsl} + total discount ----
  function compute(lines, totalDiscPct) {
    let subAn = 0;
    lines.forEach(l => { subAn += num(l.magn) * num(l.verd) * (1 - num(l.afsl) / 100); });
    const td = Math.max(0, Math.min(100, num(totalDiscPct)));
    const anAfter = subAn * (1 - td / 100);
    const vsk = anAfter * VSK;
    return { sub_an: subAn, disc_kr: subAn - anAfter, an: anAfter, vsk, m_vsk: anAfter + vsk };
  }

  // ====================== EDITOR MODAL ======================
  function open(existing) {
    document.getElementById('_bt-modal')?.remove();
    const offer = existing ? JSON.parse(JSON.stringify(existing)) : null;
    const cust = (offer && offer.customer) || {};
    // build initial per-row state, merging saved lines by name
    const savedByName = {};
    (offer && offer.lines || []).forEach(l => { savedByName[l.n] = l; });
    const rows = PRICE_LIST.map(([n, p]) => {
      const s = savedByName[n];
      return { n, verd: s ? s.verd : p, magn: s ? s.magn : 0, afsl: s ? s.afsl : 0, def: p };
    });
    const totalDisc = offer ? (offer.total_disc || 0) : 0;

    const ov = document.createElement('div');
    ov.id = '_bt-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99999;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px';
    const rowHtml = rows.map((r, i) => `
      <tr data-i="${i}">
        <td style="padding:5px 8px;font-size:12px;color:#0f172a">${esc(r.n)}</td>
        <td style="padding:5px 6px"><input data-f="magn" type="number" min="0" step="1" value="${r.magn || ''}" placeholder="0" style="width:62px;padding:5px 6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right"></td>
        <td style="padding:5px 6px"><input data-f="verd" type="number" min="0" step="1" value="${r.verd}" style="width:88px;padding:5px 6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right"></td>
        <td style="padding:5px 6px"><input data-f="afsl" type="number" min="0" max="100" step="1" value="${r.afsl || ''}" placeholder="0" style="width:54px;padding:5px 6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right"></td>
        <td data-cell="line" style="padding:5px 8px;font-size:12px;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#0f172a;white-space:nowrap">—</td>
      </tr>`).join('');

    ov.innerHTML = `
      <div style="background:#fff;border-radius:14px;max-width:920px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.3);margin:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #e2e8f0;position:sticky;top:0;background:#fff;border-radius:14px 14px 0 0;z-index:2">
          <h2 style="margin:0;font-size:17px;color:#0f172a">📋 Tilboð — Brunaviðvörunarkerfi${offer ? ' <span style="font-size:12px;color:#64748b;font-weight:400">· breyti vistuðu</span>' : ''}</h2>
          <button id="_bt-x" type="button" style="border:none;background:#f1f5f9;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:18px;color:#475569">×</button>
        </div>
        <div style="padding:18px 20px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
            <label style="font-size:11px;color:#64748b;font-weight:700">Viðskiptavinur<input id="_bt-nafn" type="text" value="${esc(cust.nafn || '')}" placeholder="Nafn fyrirtækis" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box"></label>
            <label style="font-size:11px;color:#64748b;font-weight:700">Kennitala<input id="_bt-kt" type="text" value="${esc(cust.kennitala || '')}" placeholder="000000-0000" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box"></label>
            <label style="font-size:11px;color:#64748b;font-weight:700">Dagsetning<input id="_bt-date" type="date" value="${esc((offer && offer.date) || todayISO())}" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box"></label>
            <label style="font-size:11px;color:#64748b;font-weight:700;grid-column:1 / -1">Heimilisfang<input id="_bt-addr" type="text" value="${esc(cust.heimilisfang || '')}" placeholder="Heimilisfang" style="width:100%;margin-top:3px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box"></label>
          </div>
          <div style="overflow:auto;border:1px solid #e2e8f0;border-radius:10px;max-height:42vh">
            <table style="width:100%;border-collapse:collapse">
              <thead><tr style="position:sticky;top:0;background:#f8fafc;z-index:1">
                <th style="text-align:left;padding:8px;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Liður</th>
                <th style="text-align:right;padding:8px;font-size:10px;color:#64748b;text-transform:uppercase">Magn</th>
                <th style="text-align:right;padding:8px;font-size:10px;color:#64748b;text-transform:uppercase">Verð án vsk</th>
                <th style="text-align:right;padding:8px;font-size:10px;color:#64748b;text-transform:uppercase">Afsl %</th>
                <th style="text-align:right;padding:8px;font-size:10px;color:#64748b;text-transform:uppercase">Samtals án vsk</th>
              </tr></thead>
              <tbody id="_bt-tbody">${rowHtml}</tbody>
            </table>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:16px">
            <div style="min-width:320px">
              <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#475569"><span>Samtals án vsk</span><span id="_bt-sub" style="font-variant-numeric:tabular-nums">—</span></div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px;color:#475569">
                <span>Heildarafsláttur</span>
                <span><input id="_bt-tdisc" type="number" min="0" max="100" step="1" value="${totalDisc || ''}" placeholder="0" style="width:56px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right"> %
                <span id="_bt-disc" style="margin-left:8px;color:#dc2626;font-variant-numeric:tabular-nums">—</span></span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#475569;border-top:1px solid #e2e8f0"><span>Án vsk eftir afslátt</span><span id="_bt-an" style="font-variant-numeric:tabular-nums">—</span></div>
              <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#475569"><span>VSK 24%</span><span id="_bt-vsk" style="font-variant-numeric:tabular-nums">—</span></div>
              <div style="display:flex;justify-content:space-between;padding:9px 0;font-size:17px;font-weight:800;color:#0f172a;border-top:2px solid #0f172a;margin-top:4px"><span>Samtals m. vsk</span><span id="_bt-tot" style="font-variant-numeric:tabular-nums">—</span></div>
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid #e2e8f0;position:sticky;bottom:0;background:#fff;border-radius:0 0 14px 14px">
          <button id="_bt-cancel" type="button" style="padding:10px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Loka</button>
          <button id="_bt-print" type="button" style="padding:10px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#0f172a;font-weight:700">🖨 Prenta PDF</button>
          <button id="_bt-save" type="button" style="padding:10px 18px;border:none;border-radius:8px;background:#16a34a;color:#fff;cursor:pointer;font:inherit;font-size:13px;font-weight:700">💾 Vista</button>
        </div>
      </div>`;
    document.body.appendChild(ov);

    const tbody = ov.querySelector('#_bt-tbody');
    function collect() {
      const out = [];
      tbody.querySelectorAll('tr').forEach(tr => {
        const i = +tr.dataset.i;
        out.push({ n: rows[i].n, magn: num(tr.querySelector('[data-f="magn"]').value), verd: num(tr.querySelector('[data-f="verd"]').value), afsl: num(tr.querySelector('[data-f="afsl"]').value) });
      });
      return out;
    }
    function recompute() {
      const lines = collect();
      tbody.querySelectorAll('tr').forEach(tr => {
        const i = +tr.dataset.i, l = lines[i];
        const lt = num(l.magn) * num(l.verd) * (1 - num(l.afsl) / 100);
        tr.querySelector('[data-cell="line"]').textContent = num(l.magn) > 0 ? fmtKr(lt) : '—';
        tr.style.background = num(l.magn) > 0 ? '#f0fdf4' : '';
      });
      const t = compute(lines, ov.querySelector('#_bt-tdisc').value);
      ov.querySelector('#_bt-sub').textContent = fmtKr(t.sub_an);
      ov.querySelector('#_bt-disc').textContent = t.disc_kr > 0 ? '− ' + fmtKr(t.disc_kr) : '—';
      ov.querySelector('#_bt-an').textContent = fmtKr(t.an);
      ov.querySelector('#_bt-vsk').textContent = fmtKr(t.vsk);
      ov.querySelector('#_bt-tot').textContent = fmtKr(t.m_vsk);
    }
    ov.addEventListener('input', e => { if (e.target.matches('input[type="number"]')) recompute(); });
    recompute();

    const close = () => ov.remove();
    ov.querySelector('#_bt-x').onclick = close;
    ov.querySelector('#_bt-cancel').onclick = close;
    ov.addEventListener('click', e => { if (e.target === ov) close(); });

    function build() {
      const lines = collect().filter(l => l.magn > 0);
      const td = num(ov.querySelector('#_bt-tdisc').value);
      const t = compute(lines, td);
      return {
        id: (offer && offer.id) || ('T' + Date.now()),
        created_at: (offer && offer.created_at) || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        date: ov.querySelector('#_bt-date').value || todayISO(),
        customer: { nafn: ov.querySelector('#_bt-nafn').value.trim(), kennitala: ov.querySelector('#_bt-kt').value.trim(), heimilisfang: ov.querySelector('#_bt-addr').value.trim() },
        lines, total_disc: td,
        an_vsk: Math.round(t.an), vsk: Math.round(t.vsk), m_vsk: Math.round(t.m_vsk),
      };
    }

    ov.querySelector('#_bt-print').onclick = () => printOffer(build());
    ov.querySelector('#_bt-save').onclick = async () => {
      const o = build();
      if (!o.customer.nafn) { alert('Sláðu inn viðskiptavin (nafn).'); return; }
      if (!o.lines.length) { alert('Veldu a.m.k. einn lið með magni.'); return; }
      const btn = ov.querySelector('#_bt-save'); btn.disabled = true; btn.textContent = 'Vista…';
      const arr = getOffers();
      const idx = arr.findIndex(x => x.id === o.id);
      if (idx >= 0) arr[idx] = o; else arr.unshift(o);
      const ok = await saveOffers(arr);
      if (ok === false) { btn.disabled = false; btn.textContent = '💾 Vista'; return; }
      close();
      refreshSaved();
    };
  }

  // ====================== PRINT (iframe) ======================
  function offerHtml(o) {
    const b = branding();
    const primary = (b.primary_color || '#C93C1D').trim();
    const compName = (b.company_name || 'Slökkvitæki ehf').trim();
    const logo = (b.logo_url || '').trim();
    const head = logo
      ? '<img src="' + esc(logo) + '" alt="" style="max-height:56px;max-width:240px">'
      : '<div style="font-size:24px;font-weight:800;color:#0f172a">' + esc(compName) + '</div>';
    const t = compute(o.lines, o.total_disc);
    const lineRows = o.lines.map(l => {
      const lt = num(l.magn) * num(l.verd) * (1 - num(l.afsl) / 100);
      return '<tr>' +
        '<td style="padding:7px 9px;font-size:12px;border-bottom:1px solid #f1f5f9">' + esc(l.n) + '</td>' +
        '<td style="padding:7px 9px;font-size:12px;text-align:right;border-bottom:1px solid #f1f5f9">' + (Math.round(num(l.magn) * 100) / 100) + '</td>' +
        '<td style="padding:7px 9px;font-size:12px;text-align:right;border-bottom:1px solid #f1f5f9">' + fmtKr(l.verd) + '</td>' +
        '<td style="padding:7px 9px;font-size:12px;text-align:right;border-bottom:1px solid #f1f5f9">' + (num(l.afsl) ? num(l.afsl) + '%' : '—') + '</td>' +
        '<td style="padding:7px 9px;font-size:12px;text-align:right;font-weight:600;border-bottom:1px solid #f1f5f9">' + fmtKr(lt) + '</td>' +
        '</tr>';
    }).join('');
    const totRow = (l, v, big) => '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:' + (big ? '16px;font-weight:800;border-top:2px solid #0f172a;margin-top:4px;padding-top:8px' : '12.5px;color:#475569') + '"><span>' + l + '</span><span>' + v + '</span></div>';
    return '<!DOCTYPE html><html lang="is"><head><meta charset="utf-8"><title>Tilboð — ' + esc(o.customer.nafn || '') + '</title>' +
      '<style>@page{size:A4;margin:14mm}html,body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#fff}' +
      '.btn{padding:9px 18px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:700}' +
      '@media print{.no-print{display:none!important}}</style></head><body style="padding:6mm">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ' + primary + ';padding-bottom:10px;margin-bottom:16px">' +
        '<div>' + head +
          '<div style="font-size:11px;color:#475569;margin-top:8px;line-height:1.4">' +
            (b.address1 ? esc(b.address1) + (b.address2 ? ', ' + esc(b.address2) : '') + '<br>' : '') +
            (b.phone ? 'Sími ' + esc(b.phone) : '') + (b.phone && b.email ? ' · ' : '') + (b.email ? esc(b.email) : '') +
            (b.kennitala ? '<br>kt. ' + esc(b.kennitala) : '') +
          '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="display:inline-block;background:' + primary + ';color:#fff;padding:3px 12px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">Tilboð</div>' +
          '<div style="font-size:11px;color:#64748b;margin-top:8px">' + esc(fmtDate(o.date)) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:11px 14px;margin-bottom:14px">' +
        '<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Viðskiptavinur</div>' +
        '<div style="font-size:15px;font-weight:700;margin-top:3px">' + esc(o.customer.nafn || '—') + '</div>' +
        '<div style="font-size:11px;color:#475569;margin-top:2px">' + (o.customer.kennitala ? 'kt. ' + esc(o.customer.kennitala) : '') + (o.customer.heimilisfang ? (o.customer.kennitala ? ' · ' : '') + esc(o.customer.heimilisfang) : '') + '</div>' +
      '</div>' +
      '<div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px">Brunaviðvörunarkerfi — árleg skoðun</div>' +
      '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f8fafc">' +
        '<th style="text-align:left;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Liður</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Magn</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Einingaverð</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Afsl</th>' +
        '<th style="text-align:right;padding:7px 9px;font-size:10px;color:#64748b;text-transform:uppercase">Samtals án vsk</th>' +
      '</tr></thead><tbody>' + lineRows + '</tbody></table>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:16px"><div style="min-width:300px">' +
        totRow('Samtals án vsk', fmtKr(t.sub_an)) +
        (t.disc_kr > 0 ? totRow('Heildarafsláttur (' + o.total_disc + '%)', '− ' + fmtKr(t.disc_kr)) : '') +
        totRow('Án vsk', fmtKr(t.an)) +
        totRow('VSK 24%', fmtKr(t.vsk)) +
        totRow('Samtals m. vsk', fmtKr(t.m_vsk), true) +
      '</div></div>' +
      '<div style="margin-top:24px;font-size:11px;color:#64748b">Tilboð þetta gildir í 30 daga. Verð eru með fyrirvara um breytingar á umfangi kerfis.</div>' +
      '<div class="no-print" style="margin-top:24px;text-align:center"><button class="btn" style="background:' + primary + ';color:#fff" onclick="window.print()">🖨 Prenta / vista PDF</button></div>' +
      '</body></html>';
  }

  function printOffer(o) {
    document.getElementById('_bt-print-modal')?.remove();
    const ov = document.createElement('div');
    ov.id = '_bt-print-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:100000;display:flex;flex-direction:column;padding:18px';
    ov.innerHTML =
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:10px">' +
        '<button id="_bt-pp" type="button" style="padding:9px 18px;border:none;border-radius:8px;background:#16a34a;color:#fff;font-weight:700;cursor:pointer">🖨 Prenta</button>' +
        '<button id="_bt-pc" type="button" style="padding:9px 18px;border:none;border-radius:8px;background:#fff;color:#475569;font-weight:700;cursor:pointer">Loka</button>' +
      '</div>' +
      '<iframe id="_bt-frame" style="flex:1;border:none;background:#fff;border-radius:10px" sandbox="allow-same-origin allow-modals allow-scripts"></iframe>';
    document.body.appendChild(ov);
    const frame = ov.querySelector('#_bt-frame');
    frame.srcdoc = offerHtml(o);
    ov.querySelector('#_bt-pc').onclick = () => ov.remove();
    ov.querySelector('#_bt-pp').onclick = () => { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) {} };
  }

  // ====================== SAVED LIST (bottom of page) ======================
  function mount(main) {
    const host = main.querySelector('div[style*="max-width:1200px"]') || main;
    let sec = document.getElementById('_bt-saved');
    if (!sec) {
      sec = document.createElement('div');
      sec.id = '_bt-saved';
      sec.style.cssText = 'margin-top:22px';
      host.appendChild(sec);
    }
    renderSaved(sec);
  }
  function refreshSaved() {
    const sec = document.getElementById('_bt-saved');
    if (sec) renderSaved(sec);
  }
  function renderSaved(sec) {
    const offers = getOffers().sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''));
    if (!offers.length) {
      sec.innerHTML = '<h2 style="font-size:15px;color:#0f172a;margin:0 0 8px">📋 Vistuð tilboð</h2><div style="background:#fff;border:1px dashed #cbd5e1;border-radius:10px;padding:18px;text-align:center;color:#94a3b8;font-size:13px">Engin vistuð tilboð enn — smelltu á <strong>📋 Tilboð</strong> efst til að búa til.</div>';
      return;
    }
    sec.innerHTML = '<h2 style="font-size:15px;color:#0f172a;margin:0 0 8px">📋 Vistuð tilboð <span style="font-size:12px;color:#64748b;font-weight:400">· ' + offers.length + '</span></h2>' +
      '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">' +
      offers.map(o => '' +
        '<div class="_bt-srow" data-id="' + esc(o.id) + '" style="display:flex;align-items:center;gap:12px;padding:11px 14px;border-bottom:1px solid #f1f5f9">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:13.5px;font-weight:700;color:#0f172a">' + esc(o.customer && o.customer.nafn || '—') + '</div>' +
            '<div style="font-size:11px;color:#64748b">' + esc(fmtDate(o.date)) + ' · ' + (o.lines ? o.lines.length : 0) + ' liðir' + (o.total_disc ? ' · ' + o.total_disc + '% afsl.' : '') + '</div>' +
          '</div>' +
          '<div style="font-size:14px;font-weight:800;color:#0f172a;white-space:nowrap;font-variant-numeric:tabular-nums">' + fmtKr(o.m_vsk) + '</div>' +
          '<button class="_bt-edit" type="button" style="padding:6px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:12px;color:#0f172a" title="Breyta">✏️</button>' +
          '<button class="_bt-pr" type="button" style="padding:6px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:12px" title="Prenta PDF">🖨</button>' +
          '<button class="_bt-del" type="button" style="padding:6px 11px;border:1px solid #fecaca;border-radius:7px;background:#fef2f2;cursor:pointer;font:inherit;font-size:12px;color:#dc2626" title="Eyða">🗑</button>' +
        '</div>').join('') +
      '</div>';
    sec.querySelectorAll('._bt-srow').forEach(row => {
      const id = row.dataset.id;
      const off = () => getOffers().find(x => x.id === id);
      row.querySelector('._bt-edit').onclick = () => { const o = off(); if (o) open(o); };
      row.querySelector('._bt-pr').onclick = () => { const o = off(); if (o) printOffer(o); };
      row.querySelector('._bt-del').onclick = async () => {
        const o = off(); if (!o) return;
        if (!confirm('Eyða tilboði fyrir "' + (o.customer && o.customer.nafn || '') + '"?')) return;
        await saveOffers(getOffers().filter(x => x.id !== id));
        refreshSaved();
      };
    });
  }

  // ====================== SEND FOCUS LINK (staff-only view) ======================
  function toast(msg) {
    try { if (window.Toast && window.Toast.show) { window.Toast.show(msg); return; } } catch (e) {}
    const d = document.createElement('div');
    d.textContent = msg;
    d.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:100001;background:#0f172a;color:#fff;font:13px Arial;padding:10px 16px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.3)';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3200);
  }
  function focusLink() {
    return location.origin + location.pathname + '?tab=brunakerfi&fokus=1#view-brunakerfi';
  }
  async function sendLink() {
    const url = focusLink();
    if (navigator.share) {
      try { await navigator.share({ title: 'Brunakerfisþjónusta', text: 'Tengill á Brunakerfisþjónustu — opnar aðeins þessa síðu.', url }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('✓ Tengill afritaður — sendu starfsmanni. Opnar aðeins þessa síðu.'); }
    catch (e) { prompt('Afritaðu tengilinn og sendu starfsmanni (opnar aðeins þessa síðu):', url); }
  }

  // Fókus-hamur: ef ?fokus=1 er í slóð → fela aðalvalmynd svo starfsmaður sjái
  // aðeins Brunakerfisþjónustu. Lítill flipi neðst leyfir að fara í allt kerfið.
  function applyFocus() {
    if (!/[?&]fokus=1/.test(location.search)) return;
    if (!document.getElementById('_bk-fokus-style')) {
      const st = document.createElement('style');
      st.id = '_bk-fokus-style';
      st.textContent = 'body.bk-fokus nav.view-nav{display:none!important}';
      document.head.appendChild(st);
    }
    document.body.classList.add('bk-fokus');
    if (!document.getElementById('_bk-fokus-chip')) {
      const chip = document.createElement('div');
      chip.id = '_bk-fokus-chip';
      chip.title = 'Smelltu til að opna allt kerfið';
      chip.style.cssText = 'position:fixed;bottom:10px;left:10px;z-index:90000;background:#0f172a;color:#fff;font:12px Arial;padding:6px 11px;border-radius:99px;opacity:.55;cursor:pointer';
      chip.textContent = '🔒 Brunakerfi';
      chip.onclick = () => { location.href = location.origin + location.pathname + '?tab=brunakerfi#view-brunakerfi'; };
      document.body.appendChild(chip);
    }
  }
  applyFocus();
  document.addEventListener('DOMContentLoaded', applyFocus);
  setTimeout(applyFocus, 900);

  window.BrunakerfiTilbod = { open, mount, refreshSaved, sendLink };
})();
