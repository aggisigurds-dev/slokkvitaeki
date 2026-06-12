/* === EFTIRFYLGNI v1 — nýir samningar & úttektarskýrslur ===
 *
 * Ný síða „📌 Eftirfylgni": tveir listar svo ekkert gleymist á milli skrefa —
 *
 *   1. Þjónustusamningar (úr `thjonustusamningar`, patch 50): hver nýr
 *      samningur birtist með áminningar-textaboxi („hringja fyrst", „taka
 *      stiga með" …) og ✓ hak þegar búið er að FARA Í ÚTTEKT hjá kúnnanum.
 *
 *   2. Úttektarskýrslur: allar skýrslur sem hafa verið búnar til —
 *      a) `service_visits` raðir með report_url (ÞjónustuVerkstæði, patch 190)
 *      b) PDF-viðhengi í CompanyAttachments (patch 111/168/187) sem heita
 *         eitthvað á borð við „úttekt"/„skýrsla"
 *      — hver með ✓ haki þegar REIKNINGUR hefur verið sendur. service_visits
 *      raðir sem þegar eru reikningsfærðar (invoiced_at) haka sig sjálfar.
 *
 * Eftirfylgni-staðan (hak + athugasemd) er geymd í AppSettings undir
 * `eftirfylgni` (app_settings töflunni) svo hún samstillist milli tölva:
 *   eftirfylgni.samningar[<contract id>] = { note, done, done_at }
 *   eftirfylgni.skyrslur["sv:<id>"|"att:<id>"] = { done, done_at }
 */
(() => {
  if (window.__eftirfylgniInstalled) return;
  window.__eftirfylgniInstalled = true;

  const VIEW = 'eftirfylgni';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtDate(d) {
    if (!d) return '—';
    const x = new Date(d);
    if (isNaN(x)) return '—';
    return String(x.getDate()).padStart(2, '0') + '.' + String(x.getMonth() + 1).padStart(2, '0') + '.' + x.getFullYear();
  }

  // ── Follow-up state in AppSettings ────────────────────────────────────────
  function fuState() {
    const s = (window.AppSettings && window.AppSettings.get('eftirfylgni')) || {};
    return { samningar: s.samningar || {}, skyrslur: s.skyrslur || {} };
  }
  async function fuSave(kind, key, patch) {
    if (!window.AppSettings || !window.AppSettings.save) {
      alert('Stillingakerfið (AppSettings) er ekki tilbúið — reyndu aftur.');
      return false;
    }
    const o = {}; o[String(key)] = patch;
    const wrap = { eftirfylgni: {} }; wrap.eftirfylgni[kind] = o;
    const ok = await window.AppSettings.save(wrap);
    if (!ok) alert('Tókst ekki að vista — athugaðu nettengingu.');
    return ok;
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  if (!document.getElementById('eftirfylgni-style')) {
    const st = document.createElement('style');
    st.id = 'eftirfylgni-style';
    st.textContent = `
      #view-eftirfylgni .ef-wrap { max-width: 1560px; margin: 0 auto; padding: 18px 16px 60px; }
      /* 2026-06-12 (Todoist): samningar vinstra megin, skýrslur hægra megin */
      #view-eftirfylgni .ef-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; align-items:start; }
      @media (max-width: 1100px) { #view-eftirfylgni .ef-grid { grid-template-columns:1fr; } }
      #view-eftirfylgni .ef-card { background:#fff; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,.06); margin-bottom:22px; overflow:hidden; }
      #view-eftirfylgni a.ef-co { color:#1d4ed8; text-decoration:none; }
      #view-eftirfylgni a.ef-co:hover { text-decoration:underline; }
      #view-eftirfylgni .ef-hd { display:flex; align-items:center; gap:10px; padding:14px 18px; border-bottom:1px solid #f1f5f9; }
      #view-eftirfylgni .ef-hd h3 { margin:0; font-size:15px; color:#0f172a; }
      #view-eftirfylgni .ef-count { background:#fef3c7; color:#92400e; border-radius:99px; padding:2px 10px; font-size:12px; font-weight:700; }
      #view-eftirfylgni .ef-count.ok { background:#dcfce7; color:#166534; }
      #view-eftirfylgni table { width:100%; border-collapse:collapse; }
      #view-eftirfylgni th, #view-eftirfylgni td { padding:9px 12px; text-align:left; font-size:13px; border-bottom:1px solid #f8fafc; vertical-align:middle; }
      #view-eftirfylgni th { background:#f8fafc; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#64748b; font-weight:600; }
      #view-eftirfylgni tr.ef-done td { color:#94a3b8; background:#fafcfa; }
      #view-eftirfylgni tr.ef-done .ef-name { text-decoration: line-through; text-decoration-color:#cbd5e1; }
      #view-eftirfylgni .ef-name { font-weight:600; color:#0f172a; }
      #view-eftirfylgni .ef-sub { font-size:11px; color:#94a3b8; }
      #view-eftirfylgni input.ef-note { width:100%; min-width:160px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; font:inherit; font-size:12px; background:#fffef5; }
      #view-eftirfylgni input.ef-note:focus { outline:none; border-color:#f59e0b; background:#fffbeb; }
      #view-eftirfylgni .ef-chk { width:19px; height:19px; cursor:pointer; accent-color:#16a34a; }
      #view-eftirfylgni .ef-auto { display:inline-block; background:#dcfce7; color:#166534; border-radius:99px; padding:2px 9px; font-size:11px; font-weight:700; white-space:nowrap; }
      #view-eftirfylgni .ef-doclink { color:#1d4ed8; text-decoration:none; font-weight:600; font-size:12px; white-space:nowrap; }
      #view-eftirfylgni .ef-doclink:hover { text-decoration:underline; }
      #view-eftirfylgni .ef-toggle { background:none; border:none; color:#64748b; font-size:12px; cursor:pointer; padding:8px 18px; }
      #view-eftirfylgni .ef-toggle:hover { color:#0f172a; }
      #view-eftirfylgni .ef-empty { padding:22px 18px; color:#94a3b8; font-size:13px; text-align:center; }
      #view-eftirfylgni .ef-refresh { margin-left:auto; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:600; color:#334155; cursor:pointer; }
      #view-eftirfylgni .ef-refresh:hover { background:#e2e8f0; }
    `;
    document.head.appendChild(st);
  }

  // ── Nav + view registration (same proven pattern as patch 50) ────────────
  function ensureNav() {
    if (document.querySelector('.vnav-btn[data-view="' + VIEW + '"]')) return;
    const sample = document.querySelector('.vnav-btn[data-view="samningar"]') ||
                   document.querySelector('.vnav-btn[data-view="tilbod"]');
    if (!sample) return;
    const btn = sample.cloneNode(false);
    btn.className = sample.className.replace(/\bactive\b/g, '').trim();
    btn.dataset.view = VIEW;
    btn.textContent = '📌 Eftirfylgni';
    btn.onclick = () => window.App && window.App.switchView(VIEW);
    sample.parentElement.insertBefore(btn, sample.nextSibling);
  }
  function ensureView() {
    if (document.getElementById('view-' + VIEW)) return;
    const sample = document.getElementById('view-samningar') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = 'view-' + VIEW;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.style.display = 'none';
    v.innerHTML = '<main class="main-panel"><div class="ef-wrap" id="ef-main"></div></main>';
    sample.parentElement.appendChild(v);
  }
  function patchSwitch() {
    if (!window.App || window.App._efPatch) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === VIEW) {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
        const v = document.getElementById('view-' + VIEW);
        if (v) { v.style.display = 'block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === VIEW));
        load();
        return;
      }
      orig.apply(this, arguments);
    };
    window.App._efPatch = true;
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  let _contracts = [];
  let _reports = [];   // unified: {key, date, nafn, sub, url|null, urlMeta|null, autoDone}
  let _showDoneS = false, _showDoneR = false;
  let _coByKt = {}, _coByName = {};   // fyrirtaeki resolver — opnar fyrirtækjasíðuna

  function foldName(s) {
    return String(s || '').toLowerCase().trim()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/æ/g, 'ae').replace(/ö/g, 'o')
      .replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
  }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function resolveCo(kt, nafn) {
    return _coByKt[digits(kt)] || _coByName[foldName(nafn)] || null;
  }
  function openCompany(id) {
    if (window.VidskDetail && VidskDetail.show) return VidskDetail.show(id);
    if (window.Companies && Companies.openDetail) return Companies.openDetail(id);
  }
  function coLink(id, nafn) {
    return id
      ? '<a href="#" class="ef-co" data-co="' + id + '" title="Opna fyrirtækjasíðuna">' + esc(nafn) + '</a>'
      : esc(nafn);
  }

  async function load() {
    const main = document.getElementById('ef-main');
    if (!main) return;
    main.innerHTML = '<div class="ef-empty">Hleður…</div>';
    const SB = getSB();
    if (!SB) { main.innerHTML = '<div class="ef-empty">Engin gagnabankatenging</div>'; return; }

    try {
      const [cr, vr, fr0] = await Promise.all([
        SB.from('thjonustusamningar').select('*').order('id', { ascending: false }),
        SB.from('service_visits')
          .select('id,customer_nafn,customer_kt,completed_at,started_at,report_url,invoiced_at,dk_invoice_id,technician')
          .not('report_url', 'is', null)
          .order('id', { ascending: false }),
        // fyrirtaeki resolver — paged (Supabase caps at 1000/response)
        (window.DB && DB.fetchAll)
          ? DB.fetchAll((from, to) => SB.from('fyrirtaeki').select('id,nafn,kennitala').is('deleted_at', null).range(from, to))
          : SB.from('fyrirtaeki').select('id,nafn,kennitala').is('deleted_at', null).range(0, 999).then(r => r.data || [])
      ]);
      _coByKt = {}; _coByName = {};
      (Array.isArray(fr0) ? fr0 : []).forEach(f => {
        const k = digits(f.kennitala);
        if (k && _coByKt[k] == null) _coByKt[k] = f.id;
        const n = foldName(f.nafn);
        if (n && _coByName[n] == null) _coByName[n] = f.id;
      });
      _contracts = (cr.data || []);
      if (cr.error) console.warn('[eftirfylgni] samningar:', cr.error.message);
      if (vr.error) console.warn('[eftirfylgni] service_visits:', vr.error.message);

      // Reports a) from service_visits …
      const reports = (vr.data || []).map(v => ({
        key: 'sv:' + v.id,
        date: v.completed_at || v.started_at,
        nafn: v.customer_nafn || v.customer_kt || '—',
        coId: resolveCo(v.customer_kt, v.customer_nafn),
        sub: 'ÞjónustuVerkstæði' + (v.technician ? ' · ' + v.technician : ''),
        url: v.report_url,
        urlMeta: null,
        autoDone: !!v.invoiced_at,
        autoLabel: v.invoiced_at ? ('reikningsfært ' + fmtDate(v.invoiced_at) + (v.dk_invoice_id ? ' · dk ' + v.dk_invoice_id : '')) : ''
      }));

      // … b) from CompanyAttachments metadata (report-looking PDFs)
      const attMap = (window.AppSettings && window.AppSettings.get('company_attachments')) || {};
      const looksLikeReport = n => /(útt?ekt|uttekt|sk[ýy]rsl)/i.test(String(n || ''));
      const coIds = [];
      Object.keys(attMap).forEach(coId => {
        (Array.isArray(attMap[coId]) ? attMap[coId] : []).forEach(f => {
          if (looksLikeReport(f.name)) coIds.push(+coId);
        });
      });
      let coNames = {};
      if (coIds.length) {
        const fr = await SB.from('fyrirtaeki').select('id,nafn').in('id', Array.from(new Set(coIds)).filter(n => isFinite(n)));
        (fr.data || []).forEach(f => { coNames[f.id] = f.nafn; });
      }
      Object.keys(attMap).forEach(coId => {
        (Array.isArray(attMap[coId]) ? attMap[coId] : []).forEach(f => {
          if (!looksLikeReport(f.name)) return;
          reports.push({
            key: 'att:' + f.id,
            date: f.uploaded_at,
            nafn: coNames[+coId] || ('Fyrirtæki #' + coId),
            coId: +coId || null,
            sub: f.name + (f.year ? ' · ' + f.year : ''),
            url: null,
            urlMeta: f,
            autoDone: false,
            autoLabel: ''
          });
        });
      });
      reports.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      _reports = reports;
      render();
    } catch (e) {
      console.warn('[eftirfylgni] load:', e);
      main.innerHTML = '<div class="ef-empty">Villa við að hlaða: ' + esc(e.message || e) + '</div>';
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const main = document.getElementById('ef-main');
    if (!main) return;
    const fu = fuState();

    // — Samningar section —
    const cRows = _contracts.map(c => {
      const st = fu.samningar[String(c.id)] || {};
      return { c, st, done: !!st.done };
    });
    const cPending = cRows.filter(r => !r.done), cDone = cRows.filter(r => r.done);
    const cRow = r => {
      const c = r.c, st = r.st;
      const date = c.signed_at || c.created_at;
      const coId = resolveCo(c.kennitala, c.company_nafn);
      const pdf = c.photo_url
        ? ' · <a class="ef-doclink" href="' + esc(c.photo_url) + '" target="_blank" rel="noopener" title="Opna undirritaða samninginn">📄 Samningur</a>'
        : '';
      return `<tr class="${r.done ? 'ef-done' : ''}" data-cid="${c.id}">
        <td style="white-space:nowrap">${fmtDate(date)}</td>
        <td><div class="ef-name">${coLink(coId, c.company_nafn || '—')}</div>
            <div class="ef-sub">${esc(c.heimilisfang || '')}${c.kennitala ? ' · kt ' + esc(c.kennitala) : ''}${pdf}</div></td>
        <td style="min-width:170px"><input class="ef-note" data-kind="samningar" data-key="${c.id}"
            value="${esc(st.note || '')}" placeholder="Áminning — t.d. hringja á undan, hvað á að taka með…"></td>
        <td style="text-align:center" title="${st.done_at ? 'Farið í úttekt ' + fmtDate(st.done_at) : 'Haka við þegar búið er að fara í úttekt'}">
          <input type="checkbox" class="ef-chk" data-kind="samningar" data-key="${c.id}" ${r.done ? 'checked' : ''}></td>
      </tr>`;
    };

    // — Skýrslur section —
    const rRows = _reports.map(rep => {
      const st = fu.skyrslur[rep.key] || {};
      return { rep, st, done: rep.autoDone || !!st.done };
    });
    const rPending = rRows.filter(r => !r.done), rDone = rRows.filter(r => r.done);
    const rRow = r => {
      const rep = r.rep, st = r.st;
      const docCell = rep.url
        ? `<a class="ef-doclink" href="${esc(rep.url)}" target="_blank" rel="noopener">📄 Opna skýrslu</a>`
        : `<a class="ef-doclink ef-att" href="#" data-key="${esc(rep.key)}">📄 Opna skýrslu</a>`;
      const chkCell = rep.autoDone
        ? `<span class="ef-auto" title="${esc(rep.autoLabel)}">✓ sjálfvirkt</span>`
        : `<input type="checkbox" class="ef-chk" data-kind="skyrslur" data-key="${esc(rep.key)}" ${r.done ? 'checked' : ''}
             title="${st.done_at ? 'Reikningur sendur ' + fmtDate(st.done_at) : 'Haka við þegar reikningur hefur verið sendur'}">`;
      return `<tr class="${r.done ? 'ef-done' : ''}">
        <td style="white-space:nowrap">${fmtDate(rep.date)}</td>
        <td><div class="ef-name">${coLink(rep.coId, rep.nafn)}</div><div class="ef-sub">${esc(rep.sub || '')}</div></td>
        <td>${docCell}</td>
        <td style="text-align:center">${chkCell}</td>
      </tr>`;
    };

    const tbl = (head, rows, emptyMsg) => rows.length
      ? `<table><thead><tr>${head}</tr></thead><tbody>${rows.join('')}</tbody></table>`
      : `<div class="ef-empty">${emptyMsg}</div>`;

    main.innerHTML = `
      <div class="ef-grid">
      <div class="ef-card">
        <div class="ef-hd">
          <h3>📑 Nýir þjónustusamningar — fara í úttekt</h3>
          <span class="ef-count ${cPending.length ? '' : 'ok'}">${cPending.length ? cPending.length + ' bíða' : 'allt klárt ✓'}</span>
          <button class="ef-refresh" id="ef-reload">↺ Endurhlaða</button>
        </div>
        ${tbl('<th style="width:90px">Dags</th><th>Viðskiptavinur</th><th>Áminning</th><th style="width:120px;text-align:center">Farið í úttekt</th>',
              cPending.map(cRow), 'Engir samningar bíða eftir úttekt 🎉')}
        ${cDone.length ? `<button class="ef-toggle" data-t="s">${_showDoneS ? '▾ Fela kláraða' : '▸ Sýna kláraða (' + cDone.length + ')'}</button>` : ''}
        ${_showDoneS && cDone.length
          ? tbl('<th style="width:90px">Dags</th><th>Viðskiptavinur</th><th>Áminning</th><th style="width:120px;text-align:center">Farið í úttekt</th>', cDone.map(cRow), '')
          : ''}
      </div>

      <div class="ef-card">
        <div class="ef-hd">
          <h3>📋 Úttektarskýrslur — senda reikning</h3>
          <span class="ef-count ${rPending.length ? '' : 'ok'}">${rPending.length ? rPending.length + ' bíða' : 'allt klárt ✓'}</span>
        </div>
        ${tbl('<th style="width:90px">Dags</th><th>Viðskiptavinur</th><th>Skýrsla</th><th style="width:130px;text-align:center">Reikningur sendur</th>',
              rPending.map(rRow), 'Engar skýrslur bíða eftir reikningi 🎉')}
        ${rDone.length ? `<button class="ef-toggle" data-t="r">${_showDoneR ? '▾ Fela kláraða' : '▸ Sýna kláraða (' + rDone.length + ')'}</button>` : ''}
        ${_showDoneR && rDone.length
          ? tbl('<th style="width:90px">Dags</th><th>Viðskiptavinur</th><th>Skýrsla</th><th style="width:130px;text-align:center">Reikningur sendur</th>', rDone.map(rRow), '')
          : ''}
      </div>
      </div>`;

    bind(main);
  }

  function bind(main) {
    const reload = main.querySelector('#ef-reload');
    if (reload) reload.onclick = load;

    // Nafn → fyrirtækjasíðan
    main.querySelectorAll('a.ef-co').forEach(a => {
      a.onclick = e => { e.preventDefault(); openCompany(+a.dataset.co); };
    });

    main.querySelectorAll('.ef-toggle').forEach(b => {
      b.onclick = () => {
        if (b.dataset.t === 's') _showDoneS = !_showDoneS; else _showDoneR = !_showDoneR;
        render();
      };
    });

    // Checkboxes — save immediately, re-render (row moves pending⇄done)
    main.querySelectorAll('.ef-chk').forEach(chk => {
      chk.onchange = async () => {
        const kind = chk.dataset.kind, key = chk.dataset.key;
        const fu = fuState();
        const prev = (fu[kind] && fu[kind][key]) || {};
        const ok = await fuSave(kind, key, {
          note: prev.note || '',
          done: chk.checked,
          done_at: chk.checked ? new Date().toISOString() : null
        });
        if (ok) render(); else chk.checked = !chk.checked;
      };
    });

    // Note inputs — save on blur / Enter (no save-per-keystroke)
    main.querySelectorAll('input.ef-note').forEach(inp => {
      const save = async () => {
        const kind = inp.dataset.kind, key = inp.dataset.key;
        const fu = fuState();
        const prev = (fu[kind] && fu[kind][key]) || {};
        if ((prev.note || '') === inp.value.trim()) return;
        await fuSave(kind, key, { note: inp.value.trim(), done: !!prev.done, done_at: prev.done_at || null });
      };
      inp.addEventListener('blur', save);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
    });

    // Attachment-based report links (need a signed URL at click time)
    main.querySelectorAll('a.ef-att').forEach(a => {
      a.onclick = async e => {
        e.preventDefault();
        const rep = _reports.find(x => x.key === a.dataset.key);
        if (!rep || !rep.urlMeta) return;
        const w = window.open('', '_blank');
        try {
          const url = window.CompanyAttachments && CompanyAttachments.getPublicUrl
            ? await CompanyAttachments.getPublicUrl(rep.urlMeta.path)
            : null;
          if (url && w) w.location = url;
          else { if (w) w.close(); alert('Tókst ekki að opna skýrsluna'); }
        } catch (err) {
          if (w) w.close();
          alert('Villa: ' + (err.message || err));
        }
      };
    });
  }

  function init() { ensureNav(); ensureView(); patchSwitch(); }
  setTimeout(init, 1200);
  setTimeout(init, 2800);

  console.log('[eftirfylgni] v1 ready — 📌 samningar → úttekt → reikningur');
})();
/* === END EFTIRFYLGNI v1 === */
