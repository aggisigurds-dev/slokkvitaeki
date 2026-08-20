/* === COMPANY ATTACHMENTS v1 ===
 *
 * Bætir við „📎 Skjöl & skýrslur" hluta á fyrirtækisspjaldi þar sem
 * notandi getur hlaðið inn skjölum (PDF, Word, myndir, Excel, …) sem
 * tengjast því fyrirtæki — t.d. eldri úttektarskýrslum, þjónustusamningum,
 * undirrituðum tilboðum, myndum af tækjum, o.s.frv.
 *
 * Eiginleikar:
 *   • Hlaða inn skjali (drag-and-drop eða file picker)
 *   • Listi yfir öll skjöl tengd fyrirtækinu (sortað eftir dagsetningu)
 *   • Forskoðun (PDF + myndir) í lightbox
 *   • Sækja skjal
 *   • Prenta (PDF/myndir)
 *   • Eyða skjali
 *
 * Geymsla:
 *   • Skrár fara í Supabase Storage „samningar" bucket undir
 *     „company_attachments/<co_id>/" möppu
 *   • Metagögn í AppSettings.company_attachments[co_id] = [{id,name,path,...}]
 *     (samstillt milli tækja)
 *
 * Aðgangur: nýr hluti birtist neðst á hverju fyrirtækisspjaldi.
 */
(() => {
  if (window.__companyAttachmentsInstalled) return;
  window.__companyAttachmentsInstalled = true;

  const BUCKET = 'samningar';
  const FOLDER_PREFIX = 'company_attachments';
  const STORAGE_KEY = 'company_attachments'; // AppSettings key
  const MAX_SIZE_MB = 25;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function getSB() { return (window.DB && window.DB.sb) || null; }
  function fmtSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
  }
  function iconForType(ct, name) {
    const c = String(ct || '').toLowerCase();
    const n = String(name || '').toLowerCase();
    if (c.includes('pdf') || n.endsWith('.pdf')) return { ico: '📄', label: 'PDF', color: '#dc2626' };
    if (c.includes('image') || /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(n)) return { ico: '🖼', label: 'Mynd', color: '#0ea5e9' };
    if (c.includes('word') || /\.(docx?|odt|rtf)$/.test(n)) return { ico: '📝', label: 'Word', color: '#2563eb' };
    if (c.includes('excel') || c.includes('spreadsheet') || /\.(xlsx?|ods|csv)$/.test(n)) return { ico: '📊', label: 'Excel', color: '#16a34a' };
    if (c.includes('zip') || /\.(zip|rar|7z)$/.test(n)) return { ico: '📦', label: 'Zip', color: '#a855f7' };
    if (c.includes('text') || /\.(txt|md)$/.test(n)) return { ico: '📃', label: 'Texti', color: 'var(--ink3)' };
    return { ico: '📎', label: 'Skjal', color: 'var(--ink2)' };
  }
  function isPreviewable(ct, name) {
    const c = String(ct || '').toLowerCase();
    const n = String(name || '').toLowerCase();
    return c.includes('pdf') || n.endsWith('.pdf') || c.includes('image') || /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(n);
  }

  // ── Storage helpers ──────────────────────────────────────────────────────
  function getAllAttachments() {
    const stored = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
    return (stored && typeof stored === 'object') ? stored : {};
  }
  function getCompanyAttachments(coId) {
    const all = getAllAttachments();
    const list = all[String(coId)];
    return Array.isArray(list) ? list : [];
  }
  // 2026-07-30 — TÖPUÐ SKRIF (root cause þess að „skýrsla hvarf þegar reikningur
  // var búinn til").
  //
  // Viðhengin eru ekki raðir heldur EITT jsonb-fylki inni í settings-blobbnum
  // (`company_attachments[<coId>]`). Gamla útgáfan las staðbundna afritið, bætti
  // einum hlut fremst og skrifaði ALLT fylkið til baka. `deepMerge` (85:159)
  // undanskilur fylki frá endurkvæmni og skiptir þeim út í heilu lagi — svo
  // ferska server-fylkið tapaðist fyrir gamla staðbundna afritinu + nýja hlutnum.
  // Allt sem afritið vissi ekki af EYÐILAGÐIST.
  //
  // Í úttekt→reikningur-flæðinu gerist það alltaf: 168 vistar skýrsluna sjálfvirkt
  // (539) og 165 ræsir reikningsskjalið án `await` (483), svo tvö skrif skarast og
  // það SÍÐARA (reikningurinn) vinnur. Skýrslan er þess vegna kerfisbundið sú sem
  // tapast — audit-logg staðfestir 3 töpuð viðhengi síðan 2026-07-21, ÖLL
  // `kind='skyrsla'`, ekkert reikningur. Sama gamla afrit felldi líka
  // tvítökuvarnirnar (168:423, 233:428) → „… (1).pdf" eintökin.
  //
  // Lagfæringin er þríþætt:
  //  1) RÖÐ (_saveChain): tvö skrif geta aldrei skarast, hvorki fyrir sama
  //     fyrirtæki né sitt hvort.
  //  2) SAMEINING EFTIR id gegn FERSKU server-fylki, ekki blind útskipting.
  //     Eyðing verður því að vera SKÝR (`opts.removeIds`) — „vantar í fylkið"
  //     getur ekki lengur þýtt eytt, því fylkið sem berst er kannski gamalt.
  //  3) ÞRÖNGUR patch: aðeins ÞETTA fyrirtæki fer í `save()`. Áður fór öll
  //     `company_attachments`-varpan með, svo staðbundin gömul fylki ANNARRA
  //     fyrirtækja skrifuðust yfir ferska server-útgáfu þeirra — sami galli
  //     einu lagi ofar.
  const attKey = (f) => (f && (f.id || f.path)) || null;
  let _saveChain = Promise.resolve();

  async function serverAttachments(coId) {
    const SB = getSB();
    if (!SB) return null;                       // engin tenging → engin sameining
    try {
      // 2026-08-05 (hraða-úttekt): sótti ALLAN stillingar-blobbinn (1,6 MB) í
      // hvert sinn sem viðhengi eru vistuð, til að lesa eina fyrirtækjaröð.
      // Sækjum bara viðhengja-lykilinn (450 kB → og aðeins við vistun).
      const r = await SB.from('app_settings')
        .select('att:settings->company_attachments').eq('id', 1).maybeSingle();
      const map = (r && r.data && r.data.att) || null;
      const arr = map && map[String(coId)];
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return null; }
  }

  async function saveCompanyAttachments(coId, list, opts) {
    if (!window.AppSettings || !window.AppSettings.save) return false;
    const run = async () => {
      const remove = new Set((opts && opts.removeIds) || []);
      const server = await serverAttachments(coId);
      const byId = new Map();
      // Server fyrst, staðbundið ofan á: sami id → staðbundna útgáfan vinnur
      // (hún ber nýjustu ritstýringar eins og árs-merkingu), en allt sem AÐEINS
      // er til á server lifir af.
      if (Array.isArray(server)) {
        server.forEach(f => { const k = attKey(f); if (k && !remove.has(k)) byId.set(k, f); });
      }
      (Array.isArray(list) ? list : []).forEach(f => {
        const k = attKey(f); if (k && !remove.has(k)) byId.set(k, f);
      });
      const merged = [...byId.values()].sort((a, b) =>
        String((b && b.uploaded_at) || '').localeCompare(String((a && a.uploaded_at) || '')));
      return await window.AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: merged } });
    };
    _saveChain = _saveChain.then(run, run);   // röðin brotnar ekki þótt eitt skrif falli
    return _saveChain;
  }

  // 2026-06-18: when an úttektarskýrsla is attached for a year, light up the
  // "skoðað" marking for that company so the Fyrirtæki-í-þjónustu status pill
  // matches reality — the done state is EVIDENCED by the report, not a loose
  // manual flag (this is the Heimaleiga fix: attach the right report → it
  // counts as serviced). Only bumps forward (never un-marks a newer year).
  async function markInspectedFromReport(coId, year) {
    if (!window.AppSettings || !window.AppSettings.save) return;
    const y = parseInt(year, 10);
    if (!y) return;
    const ARS = 'arsskodun_customers';
    const all = (window.AppSettings.path && window.AppSettings.path(ARS)) || {};
    const cur = Object.assign({}, all[String(coId)] || {});
    const existing = parseInt(cur.last_year_inspected, 10) || 0;
    if (y <= existing) return;            // already marked this year or newer
    cur.co_id = coId;
    // 2026-07-30: geymt sem TALA (var String(y)). Patch 266 ber saman með === við
    // curYear (tölu), svo "2026" === 2026 var alltaf false og félag sem varð grænt
    // við að hengja við úttektarskýrslu datt aftur í 🔵 „Í vinnslu" á Verkstæðinu.
    cur.last_year_inspected = y;
    // AppSettings.save deep-merges, so this only touches last_year_inspected.
    await window.AppSettings.save({ [ARS]: { [String(coId)]: cur } });
    try { document.dispatchEvent(new CustomEvent('arsskodun-marking-changed', { detail: { coId, year: y } })); } catch (_) {}
    try { if (window.Arsskodun && Arsskodun.render) Arsskodun.render(); } catch (_) {}
  }
  async function getPublicUrl(path) {
    const SB = getSB();
    if (!SB) return null;
    try {
      const r = await SB.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (r && r.data && r.data.signedUrl) return r.data.signedUrl;
    } catch (_) {}
    try {
      const r = SB.storage.from(BUCKET).getPublicUrl(path);
      if (r && r.data && r.data.publicUrl) return r.data.publicUrl;
    } catch (_) {}
    return null;
  }

  // 2026-07-30 — BRÚ Í TRACKERINN (amber-leiðin).
  // Sjálf-gerðar skýrslur (patch 168/233) POSTa á brunahólfs `/api/uttekt-upload`
  // sem setur AFRIT í kanónísku Úttektarskýrslur-möppuna OG skrifar röð í
  // `customer_documents` — það er ÞAÐ sem gerir árs-reitinn grænan í Kerfis-korti,
  // Skýrslu-vakt og Veiðinni. HANDVIRKT viðhengi fór hingað til AÐEINS í
  // `samningar`-bucketið, svo skýrsla sem Agnar hlóð sjálfur inn leit út fyrir að
  // vera komin á prófílnum en taldist samt „engin skýrsla" alls staðar annars
  // staðar. Þessi brú lokar því gati.
  //
  // Reglur: aðeins úttektarskýrslur (kind='skyrsla'; brunakerfis-skýrslur bera
  // noBridge/noMark og eiga annað doc_type), aðeins með ÁR, aðeins PDF.
  // Fire-and-forget — ALLTAF LEYFA VISTUN: viðhengið er þegar vistað þegar
  // þetta keyrir og bilun hér má ALDREI fella upphlaðninguna.
  const BRIDGE_URL = 'https://brunaholf.netlify.app/api/uttekt-upload';
  const BRIDGE_MAX_MB = 10;               // þak endapunktsins

  async function bridgeReportToTracker(coId, meta) {
    const SB = getSB();
    if (!SB) return;
    if (!/pdf/i.test(meta.content_type || '') && !/\.pdf$/i.test(meta.name || '')) return;
    if (meta.size && meta.size > BRIDGE_MAX_MB * 1024 * 1024) {
      console.warn('[111] skýrsla > ' + BRIDGE_MAX_MB + ' MB — ekki brúað í trackerinn');
      return;
    }
    // Staðurinn: coId ER fyrirtaeki.id, svo brúin þarf ekki að giska (hún sendir
    // fyrirtaeki_id og brunahólfs-megin er það treyst óbreytt).
    let co = null;
    try {
      const r = await SB.from('fyrirtaeki')
        .select('id,nafn,kennitala,heimilisfang').eq('id', coId).maybeSingle();
      co = r && r.data;
    } catch (_) {}
    if (!co || !co.kennitala) {
      console.warn('[111] engin kennitala á fyrirtæki ' + coId + ' — skýrsla ekki brúuð');
      return;
    }
    const url = await getPublicUrl(meta.path);
    if (!url) { console.warn('[111] fékk enga slóð á skjalið — ekki brúað'); return; }
    try {
      const r = await fetch(BRIDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kt: co.kennitala,
          fyrirtaeki_id: co.id,
          company: co.nafn || '',
          address: co.heimilisfang || '',
          year: parseInt(meta.year, 10),
          filename: meta.name,
          public_url: url
        })
      });
      if (!r.ok) { console.warn('[111] uttekt-upload', r.status); return; }
      const j = await r.json().catch(() => null);
      if (j && j.ok) {
        console.log('[111] skýrsla skráð í trackerinn:', j.name || meta.name);
        try { document.dispatchEvent(new CustomEvent('tracker-doc-added', { detail: { coId, year: meta.year, doc_id: j.doc_id } })); } catch (_) {}
      }
    } catch (e) { console.warn('[111] uttekt-upload', e && e.message); }
  }

  async function uploadAttachment(coId, file, opts) {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return null; }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert('Skráin er stærri en ' + MAX_SIZE_MB + ' MB hámark.');
      return null;
    }
    const ts = Date.now();
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const path = FOLDER_PREFIX + '/' + coId + '/' + ts + '_' + safeName;
    try {
      const r = await SB.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      });
      if (r.error) {
        alert('Villa við upphlaðningu: ' + r.error.message);
        return null;
      }
      // Year: explicit (year-cell upload from the 23/24/25/26 columns) wins,
      // else auto-tag from the filename (e.g. "Rjúpufell 2025.pdf") so it
      // lights up in the year columns without manual tagging.
      const ym = (opts && opts.year) ? [null, String(opts.year)] : file.name.match(/\b(20[2-3][0-9])\b/);
      const meta = {
        id: 'a_' + ts + '_' + Math.random().toString(36).slice(2,8),
        name: file.name,
        path,
        content_type: file.type || '',
        size: file.size,
        uploaded_at: new Date().toISOString(),
        year: ym ? ym[1] : null,
        // explicit doc kind from the year-grid attach buttons ('skyrsla' /
        // 'reikningur'); null when uploaded via the generic picker.
        kind: (opts && opts.kind) || null
      };
      const list = getCompanyAttachments(coId);
      list.unshift(meta);
      await saveCompanyAttachments(coId, list);
      if (meta.year) { try { document.dispatchEvent(new CustomEvent('attachment-year-changed')); } catch (_) {} }
      // úttektarskýrsla attached → light up the skoðað-marking for that year.
      // opts.noMark: brunakerfis-skýrslur (patch 273) fara í skýrsludálkinn án
      // þess að merkja slökkvitækja-ársskoðunina — aðskildar þjónustur (Agnar).
      if (meta.year && (opts && opts.kind) === 'skyrsla' && !(opts && opts.noMark)) {
        try { await markInspectedFromReport(coId, meta.year); } catch (_) {}
        // …og skrá hana í customer_documents + kanónísku Drive-möppuna, svo hún
        // teljist líka utan þessa prófíls. Ekki beðið eftir (fire-and-forget).
        if (!(opts && opts.noBridge)) {
          bridgeReportToTracker(coId, meta).catch(e => console.warn('[111] brú', e && e.message));
        }
      }
      return meta;
    } catch (e) {
      alert('Villa: ' + (e.message || String(e)));
      return null;
    }
  }

  async function deleteAttachment(coId, file) {
    const SB = getSB();
    if (!SB) return false;
    try {
      const r = await SB.storage.from(BUCKET).remove([file.path]);
      if (r && r.error) console.warn('[company-attach] storage remove:', r.error.message);
    } catch (e) { console.warn('[company-attach] remove exception:', e); }
    // Eyðing verður að vera SKÝR: `saveCompanyAttachments` sameinar nú við ferskt
    // server-fylki, svo það dugar ekki lengur að sleppa hlutnum úr listanum —
    // hann kæmi einfaldlega aftur af server. `removeIds` tekur bæði id og path
    // svo eldri færslur án id eyðist líka.
    const list = getCompanyAttachments(coId).filter(f => f.id !== file.id);
    return await saveCompanyAttachments(coId, list, {
      removeIds: [file.id, file.path].filter(Boolean)
    });
  }

  // ── UI: section on company detail ────────────────────────────────────────
  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    // 2026-05-31: Prefer the stable data-co-id on the company-detail action
    // bar (features.js) over scraping a Companies.openEdit button. Stray
    // openEdit buttons elsewhere in companies-main could make querySelector
    // capture the WRONG company, filing uploaded PDFs under the wrong
    // fyrirtæki. The :not(._cat-section) guard skips our own section, which
    // also carries a data-co-id.
    const idEl = main.querySelector('[data-co-id]:not(._cat-section)');
    if (idEl) {
      const v = idEl.getAttribute('data-co-id');
      if (v && /^\d+$/.test(v)) return +v;
    }
    // Legacy fallback: scrape the hidden edit-anchor's onclick handler.
    const editBtn = main.querySelector('button[onclick*="Companies.openEdit"]');
    if (!editBtn) return null;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
    return m ? +m[1] : null;
  }

  // 2026-06-19: the standalone "📎 Skjöl & skýrslur" card is now SUPPRESSED —
  // patch 199 renders the single unified "📁 Skjöl & viðhengi" card (the v6
  // mockup) and reuses this file purely as the engine (upload / list / preview /
  // delete / pick via window.CompanyAttachments). Flip to false to bring the
  // standalone manager card back.
  const SUPPRESS_CARD = true;

  // 2026-05-21: small flag so our own moveToBottom() doesn't bounce back
  // through the MutationObserver and into patch 129's observer in a loop.
  let _moving = false;
  function injectSection() {
    if (SUPPRESS_CARD) {
      // Clean up a stale card if a previous build left one behind.
      const old = document.querySelector('._cat-section');
      if (old) old.remove();
      return;
    }
    const main = document.getElementById('companies-main');
    if (!main) return;
    const coId = getCompanyId();
    if (!coId) return;
    const existing = main.querySelector('._cat-section');
    if (existing) {
      // already injected — keep at the very bottom even when later patches
      // (heildarkostnaður, notes, visit-workflow) append their own sections.
      if (main.lastElementChild !== existing) {
        _moving = true;
        main.appendChild(existing);
        // Clear the flag after the current microtask so the MutationObserver
        // callback (queued sync by appendChild) sees _moving=true and skips.
        setTimeout(() => { _moving = false; }, 0);
      }
      return;
    }

    const section = document.createElement('div');
    section.className = '_cat-section';
    section.dataset.coId = coId;
    section.style.cssText = 'margin:18px 0 24px;padding:16px;border:1px solid var(--brd);border-radius:12px;background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,0.04)';
    section.innerHTML = renderSection(coId);

    // Append last — and the early-return above re-appends on every render
    // so it stays last.
    main.appendChild(section);
    wireSection(section, coId);
  }

  // 2026-06: yfirlits-grid — úttektarskýrslur + reikningar per ár (2023–2026)
  // úr SÖMU skjölum (flokkað eftir ári + heiti). Chip-arnir endurnýta sömu
  // _cat-open/_cat-download smelli-meðhöndlun og listinn að neðan.
  function docYearGridHtml(list) {
    const YEARS = [2026, 2025, 2024, 2023];
    const cell = {}; // cell[year][type] = [files]
    (list || []).forEach(f => {
      const nm = String(f.name || '');
      const yr = (f.year && f.year !== '0') ? String(f.year) : ((nm.match(/\b(20[2-3][0-9])\b/) || [])[1] || null);
      if (!yr) return;
      if (!(f.drive_url || f.drive_id || f.path)) return; // skráningar án skjals sleppt
      // explicit kind (from the cell attach buttons) wins over name-sniffing
      let type = (f.kind === 'skyrsla' || f.kind === 'reikningur') ? f.kind : null;
      if (!type) {
        if (/reikn|r-?\s?\d{3,}/i.test(nm)) type = 'reikningur';
        else if (/sko(ð|d)un|(ú|u)ttekt|sk(ý|y)rsl/i.test(nm)) type = 'skyrsla';
      }
      if (!type) return;
      (cell[yr] = cell[yr] || {});
      (cell[yr][type] = cell[yr][type] || []).push(f);
    });
    const chip = (f, kind) => {
      const prev = isPreviewable(f.content_type, f.name);
      const nm = String(f.name || '');
      const c = kind === 'reikningur'
        ? { bg: '#f0fdf4', bd: '#bbf7d0', col: '#15803d', ico: '🧾', lab: (nm.match(/R-?\s?\d{3,}/i) || ['Reikningur'])[0].replace(/\s+/g, '') }
        : { bg: '#f5f3ff', bd: '#ddd6fe', col: '#6d28d9', ico: '📄', lab: 'Skoðun' };
      return '<button class="' + (prev ? '_cat-open' : '_cat-download') + '" data-id="' + esc(f.id) + '" title="' + esc(nm) + '" ' +
        'style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:8px;cursor:pointer;margin:2px 2px 0 0;' +
        'background:' + c.bg + ';border:1px solid ' + c.bd + ';color:' + c.col + '">' + c.ico + ' ' + esc(c.lab) + '</button>';
    };
    // Per-cell attach/change button — uploads the picked file pre-tagged with
    // (year, kind). Attaching an úttektarskýrsla lights up the skoðað-marking.
    const addBtn = (y, kind, has) => '<button class="_cat-cell-add" data-year="' + y + '" data-kind="' + kind + '" ' +
      'title="' + (has ? 'Bæta við / skipta um ' : 'Tengja ') + (kind === 'skyrsla' ? 'úttektarskýrslu' : 'reikning') + ' fyrir ' + y + '" ' +
      'style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:8px;cursor:pointer;margin:2px 2px 0 0;background:var(--surface);border:1px dashed ' + (has ? 'var(--brd2)' : 'var(--hairline)') + ';color:var(--ink3)">＋' + (has ? '' : ' Tengja') + '</button>';
    const rows = YEARS.map(y => {
      const sk = (cell[y] && cell[y].skyrsla) || [];
      const re = (cell[y] && cell[y].reikningur) || [];
      const isCur = (y === new Date().getFullYear());
      return '<tr style="border-top:1px solid var(--brd)">' +
        '<td style="padding:8px 12px;font-weight:700;color:' + (isCur ? '#1d4ed8' : '#0f172a') + '">' + y + '</td>' +
        '<td style="padding:6px 12px">' + sk.map(f => chip(f, 'skyrsla')).join('') + addBtn(y, 'skyrsla', sk.length) + '</td>' +
        '<td style="padding:6px 12px">' + re.map(f => chip(f, 'reikningur')).join('') + addBtn(y, 'reikningur', re.length) + '</td>' +
      '</tr>';
    }).join('');
    return '<div style="margin-bottom:16px;background:var(--surface);border:1px solid var(--brd);border-radius:12px;overflow:hidden">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-bottom:1px solid var(--brd)">' +
        '<h3 style="margin:0;font-size:14px;font-weight:800;color:var(--ink1)">📁 Skjöl eftir ári</h3>' +
        '<span style="font-size:11px;color:var(--ink4)">2023–2026</span>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12.5px">' +
        '<thead><tr style="background:var(--surface2);color:var(--ink2);font-size:10px;text-transform:uppercase;letter-spacing:.04em">' +
          '<th style="padding:8px 12px;text-align:left">Ár</th>' +
          '<th style="padding:8px 12px;text-align:left">Úttektarskýrsla</th>' +
          '<th style="padding:8px 12px;text-align:left">Reikningur</th>' +
        '</tr></thead><tbody>' + rows + '</tbody>' +
      '</table></div>';
  }

  function renderSection(coId) {
    const list = getCompanyAttachments(coId);
    const cards = list.length ? list.map(f => {
      const ic = iconForType(f.content_type, f.name);
      return '' +
      '<div class="_cat-card" data-id="' + esc(f.id) + '" style="background:var(--surface);border:1px solid var(--brd);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;box-shadow:0 1px 2px rgba(0,0,0,0.03)">' +
        '<div style="display:flex;align-items:flex-start;gap:8px">' +
          '<div style="font-size:24px;line-height:1;flex-shrink:0">' + ic.ico + '</div>' +
          '<div style="min-width:0;flex:1">' +
            '<div style="font-weight:700;font-size:13px;color:var(--ink1);line-height:1.3;word-break:break-word">' + esc(f.name) + '</div>' +
            '<div style="font-size:11px;color:var(--ink3);margin-top:2px">' + fmtSize(f.size) + ' · ' + fmtDate(f.uploaded_at) + '</div>' +
          '</div>' +
          '<span style="font-size:9px;font-weight:700;background:' + ic.color + '15;color:' + ic.color + ';padding:2px 6px;border-radius:99px;text-transform:uppercase;letter-spacing:0.04em;flex-shrink:0">' + ic.label + '</span>' +
        '</div>' +
        (() => {
          // Effective year: explicit tag, else auto-detected from the filename
          // (year === '0' = user explicitly cleared — no auto-detection).
          const nm = (f.year == null && (String(f.name||'').match(/\b(20[2-3][0-9])\b/) || [])[1]) || null;
          const eff = (f.year && f.year !== '0') ? String(f.year) : nm;
          return '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--ink3)">' +
          'Ár:' +
          '<select class="_cat-year" data-id="' + esc(f.id) + '" onclick="event.stopPropagation()" style="font:inherit;font-size:11px;padding:2px 4px;border:1px solid ' + (eff ? '#86efac' : 'var(--brd)') + ';border-radius:6px;background:' + (eff ? '#f0fdf4' : '#fff') + ';color:var(--ink1)">' +
            '<option value=""' + (!eff ? ' selected' : '') + '>—</option>' +
            ['2023','2024','2025','2026'].map(y => '<option value="' + y + '"' + (eff === y ? ' selected' : '') + '>' + y + '</option>').join('') +
          '</select>' +
          (eff ? '<span title="Birtist í ' + esc(eff) + ' dálki í Fyrirtæki í þjónustu listanum' + (f.year ? '' : ' (sjálfvirkt af skráarnafni)') + '" style="color:#15803d;font-weight:700">📄→' + esc(eff.slice(2)) + (f.year ? '' : '<span style="color:var(--ink4);font-weight:500"> sjálfv.</span>') + '</span>' : '') +
        '</div>'; })() +
        '<div style="display:flex;gap:4px;margin-top:auto;flex-wrap:wrap">' +
          // Only show open/download when an actual file is attached. Marker rows
          // (e.g. "Þjónustusamningur skráður (Samningar.xlsx …)") have no
          // drive_url/drive_id/path — a button there built …/file/d/undefined/view.
          ((f.drive_url || f.drive_id || f.path)
            ? ((isPreviewable(f.content_type, f.name)
                ? '<button class="_cat-open btn btn-primary btn-sm" data-id="' + esc(f.id) + '" style="flex:1;font-size:11px">📂 Opna</button>'
                : '<button class="_cat-download btn btn-primary btn-sm" data-id="' + esc(f.id) + '" style="flex:1;font-size:11px">⬇ Sækja</button>') +
               '<button class="_cat-download2 btn btn-outline btn-sm" data-id="' + esc(f.id) + '" title="Sækja" style="font-size:11px">⬇</button>')
            : '<span style="flex:1;font-size:10.5px;color:var(--ink4);align-self:center">Skráning · ekkert skjal viðhengt</span>') +
          '<button class="_cat-del btn btn-outline btn-sm" data-id="' + esc(f.id) + '" style="color:#dc2626;border-color:#fecaca;font-size:11px" title="Eyða">✕</button>' +
        '</div>' +
      '</div>';
    }).join('') : '<div style="grid-column:1/-1;padding:30px;text-align:center;color:var(--ink4);font-size:13px;background:var(--surface2);border:1px dashed var(--brd2);border-radius:10px">Engin skjöl tengd þessu fyrirtæki ennþá — smelltu á <strong>+ Hlaða inn skjali</strong> til að byrja</div>';

    return '' +
      // docYearGridHtml removed — patch 199 now renders the canonical v6
      // "Skjöl eftir ári" grid (from customer_documents). Keep only uploads here.
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
        '<div>' +
          '<h3 style="margin:0;font-size:15px;font-weight:700;color:var(--ink1)">📎 Skjöl & skýrslur</h3>' +
          '<div style="font-size:11px;color:var(--ink3);margin-top:2px">Eldri úttektarskýrslur, samningar, myndir, og önnur skjöl tengd þessu fyrirtæki.</div>' +
        '</div>' +
        '<button class="_cat-upload btn btn-primary btn-sm" style="padding:8px 14px">+ Hlaða inn skjali</button>' +
      '</div>' +
      '<div class="_cat-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">' + cards + '</div>' +
      '<input type="file" class="_cat-file-input" accept="*/*" style="display:none">' +
      '<div class="_cat-dropzone" style="margin-top:10px;padding:14px;text-align:center;font-size:12px;color:var(--ink4);border:2px dashed transparent;border-radius:8px;transition:all .15s">Eða dragðu skjal hingað til að hlaða inn</div>';
  }

  function wireSection(section, coId) {
    const fileInput = section.querySelector('._cat-file-input');
    const dropzone = section.querySelector('._cat-dropzone');
    // pending attach context from a year-grid cell button ({year, kind})
    let _pendingCtx = null;

    section.addEventListener('click', async e => {
      const upBtn = e.target.closest('._cat-upload');
      const cellAdd = e.target.closest('._cat-cell-add');
      const openBtn = e.target.closest('._cat-open');
      const dlBtn = e.target.closest('._cat-download, ._cat-download2');
      const delBtn = e.target.closest('._cat-del');

      if (upBtn) { e.stopPropagation(); _pendingCtx = null; fileInput.click(); return; }

      if (cellAdd) {
        e.stopPropagation();
        _pendingCtx = { year: cellAdd.dataset.year, kind: cellAdd.dataset.kind };
        fileInput.click();
        return;
      }

      if (openBtn) {
        e.stopPropagation();
        const f = getCompanyAttachments(coId).find(x => x.id === openBtn.dataset.id);
        if (f) openPreview(f);
        return;
      }

      if (dlBtn) {
        e.stopPropagation();
        const f = getCompanyAttachments(coId).find(x => x.id === dlBtn.dataset.id);
        if (f) downloadFile(f);
        return;
      }

      if (delBtn) {
        e.stopPropagation();
        const f = getCompanyAttachments(coId).find(x => x.id === delBtn.dataset.id);
        if (!f) return;
        if (await Confirm.show('Eyða skjalinu „' + f.name + '"? Þetta er ekki afturkræft.')) {
          delBtn.disabled = true;
          await deleteAttachment(coId, f);
          refreshSection(section, coId);
        }
        return;
      }
    });

    // Year tag changed on a card → persist + tell the year-columns patch (187)
    // so the 23/24/25/26 view refreshes its icons.
    section.addEventListener('change', async e => {
      const sel = e.target.closest('._cat-year');
      if (!sel) return;
      e.stopPropagation();
      const list = getCompanyAttachments(coId);
      const f = list.find(x => x.id === sel.dataset.id);
      if (!f) return;
      // '' (—) stores '0' = explicitly none, so filename auto-detection
      // doesn't resurrect a cleared tag.
      f.year = sel.value === '' ? '0' : sel.value;
      await saveCompanyAttachments(coId, list);
      try { document.dispatchEvent(new CustomEvent('attachment-year-changed')); } catch (_) {}
      refreshSection(section, coId);
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const ctx = _pendingCtx; _pendingCtx = null;
      await doUpload(file, ctx);
      fileInput.value = '';
    });

    // Drag-and-drop
    if (dropzone) {
      ['dragenter', 'dragover'].forEach(ev =>
        dropzone.addEventListener(ev, e => {
          e.preventDefault();
          dropzone.style.borderColor = '#16a34a';
          dropzone.style.background = '#dcfce7';
          dropzone.style.color = '#166534';
        })
      );
      ['dragleave', 'drop'].forEach(ev =>
        dropzone.addEventListener(ev, e => {
          e.preventDefault();
          dropzone.style.borderColor = 'transparent';
          dropzone.style.background = '';
          dropzone.style.color = 'var(--ink4)';
        })
      );
      dropzone.addEventListener('drop', async e => {
        e.preventDefault();
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) await doUpload(file);
      });
    }

    async function doUpload(file, opts) {
      const upBtn = section.querySelector('._cat-upload');
      if (upBtn) { upBtn.disabled = true; upBtn.textContent = '⏳ Hleður upp...'; }
      const result = await uploadAttachment(coId, file, opts);
      if (upBtn) { upBtn.disabled = false; upBtn.textContent = '+ Hlaða inn skjali'; }
      if (result) {
        const msg = (opts && opts.kind === 'skyrsla') ? '✓ Úttektarskýrsla tengd ' + (opts.year || '')
                  : (opts && opts.kind === 'reikningur') ? '✓ Reikningur tengdur ' + (opts.year || '')
                  : '✓ Skjal hlaðið inn';
        if (window.Toast && Toast.show) Toast.show(msg.trim());
        refreshSection(section, coId);
      }
    }
  }

  function refreshSection(section, coId) {
    section.innerHTML = renderSection(coId);
    wireSection(section, coId);
  }

  // ── Preview / download ──────────────────────────────────────────────────
  async function openPreview(file) {
    // Drive-link attachments (added by patch 147's brunakerfi bulk-import in
    // session 2026-05-15) carry `drive_url` / `drive_id` instead of a Supabase
    // Storage `path`. Open them directly in Drive viewer — patch 111's
    // preview lightbox can't host Google Drive content securely anyway.
    const driveUrl = (file && file.drive_url) ? file.drive_url
      : (file && file.drive_id ? 'https://brunaholf.netlify.app/api/skjal?id=' + encodeURIComponent(file.drive_id) : '');
    if (driveUrl) { window.open(driveUrl, '_blank', 'noopener'); return; }
    if (!file || !file.path) { alert('Engin skrá fylgir þessari færslu — þetta er skráning (t.d. úr Samningar.xlsx), ekki upphlaðið skjal.'); return; }
    const url = await getPublicUrl(file.path);
    if (!url) { alert('Gat ekki opnað skrá. Athugaðu nettengingu.'); return; }
    const ic = iconForType(file.content_type, file.name);
    const isPdf = ic.label === 'PDF';
    const isImg = ic.label === 'Mynd';

    let dlg = document.getElementById('_cat-preview');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_cat-preview';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100023;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;padding:0';
    dlg.innerHTML =
      '<div style="padding:12px 18px;background:var(--brand);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
        '<div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">' +
          '<span style="font-size:22px;line-height:1">' + ic.ico + '</span>' +
          '<div style="min-width:0">' +
            '<div style="font-weight:700;font-size:14px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(file.name) + '</div>' +
            '<div style="font-size:11px;color:var(--ink4);margin-top:2px">' + fmtSize(file.size) + ' · ' + fmtDate(file.uploaded_at) + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-shrink:0">' +
          (isPdf || isImg ? '<button class="_catp-print" type="button" style="padding:8px 14px;background:var(--surface);color:var(--ink1);border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600">🖨 Prenta</button>' : '') +
          '<a href="' + esc(url) + '" download="' + esc(file.name) + '" target="_blank" rel="noopener" style="padding:8px 14px;background:var(--ink1);color:#fff;border:1px solid var(--ink2);border-radius:7px;text-decoration:none;font-size:13px;font-weight:600">⬇ Sækja</a>' +
          '<button id="_catp-x" type="button" style="background:none;border:1px solid var(--ink2);color:var(--brd2);font-size:20px;width:38px;height:38px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
      '</div>' +
      '<div style="flex:1;background:var(--ink1);display:flex;align-items:center;justify-content:center;padding:0;overflow:hidden">' +
        (isPdf ? '<iframe src="' + esc(url) + '" style="width:100%;height:100%;border:none;background:var(--surface)"></iframe>'
         : isImg ? '<img src="' + esc(url) + '" alt="' + esc(file.name) + '" style="max-width:100%;max-height:100%;object-fit:contain">'
         : '<div style="color:var(--brd2);text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:12px">' + ic.ico + '</div><div>Forskoðun ekki tiltæk fyrir þetta skjal.</div><div style="margin-top:8px;font-size:13px;color:var(--ink4)">Sæktu skjalið með ⬇ Sækja takkanum.</div></div>') +
      '</div>';
    document.body.appendChild(dlg);
    function close() { dlg.remove(); }
    dlg.querySelector('#_catp-x').addEventListener('click', close);
    dlg.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    setTimeout(() => dlg.focus(), 50);

    const printBtn = dlg.querySelector('._catp-print');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        const win = window.open('', 'cat-print', 'width=900,height=1100');
        if (!win) { alert('Sprettigluggi var lokaður — leyfðu sprettiglugga til að prenta.'); return; }
        if (isPdf) {
          win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(file.name) + '</title><style>html,body{margin:0;height:100%;background:#525659}iframe{border:none;width:100%;height:100%}</style></head><body><iframe src="' + esc(url) + '" onload="setTimeout(function(){try{this.contentWindow.print();}catch(e){window.print();}},500)"></iframe></body></html>');
        } else {
          win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(file.name) + '</title><style>@media print{@page{size:A4;margin:14mm}}body{margin:0;padding:14mm;background:var(--surface);text-align:center;font-family:Arial,Helvetica,sans-serif}img{max-width:100%;max-height:90vh;object-fit:contain}@media print{body{padding:0}img{max-height:none}}</style></head><body><img src="' + esc(url) + '" alt="' + esc(file.name) + '" onload="setTimeout(function(){window.print();},250)"></body></html>');
        }
        win.document.close();
      });
    }
  }

  async function downloadFile(file) {
    // Drive files — open the viewer; Drive handles download itself. Only when a
    // real reference exists, so marker rows don't build …/file/d/undefined/view.
    const driveUrl = (file && file.drive_url) ? file.drive_url
      : (file && file.drive_id ? 'https://brunaholf.netlify.app/api/skjal?id=' + encodeURIComponent(file.drive_id) : '');
    if (driveUrl) { window.open(driveUrl, '_blank', 'noopener'); return; }
    if (!file || !file.path) { alert('Engin skrá fylgir þessari færslu — þetta er skráning (t.d. úr Samningar.xlsx), ekki upphlaðið skjal.'); return; }
    const url = await getPublicUrl(file.path);
    if (!url) { alert('Gat ekki sótt skrá.'); return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 200);
  }

  // ── Watch for company detail being rendered ────────────────────────────
  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    let _t = 0;
    // 2026-05-21: narrowed scope + self-mutation guard + bigger debounce.
    //   • childList only (no subtree): we just need to react when sections
    //     are added/removed at the top level, not on every text-node update
    //     inside _ctc-section that happens every keystroke or re-render.
    //   • _moving guard: ignore the synthetic mutation produced by our own
    //     "move to bottom" appendChild — otherwise that mutation triggers
    //     patch 129's observer → re-render → moves things → triggers us →
    //     re-append → loop. Killed responsiveness on the detail view.
    //   • 600ms debounce (was 200ms): coalesces bursts of patches that
    //     inject their sections in rapid succession.
    new MutationObserver((muts) => {
      if (_moving) return;
      // Ignore mutations where only our own ._cat-section was added/removed
      const ours = muts.every(m => {
        const nodes = [].concat(Array.from(m.addedNodes), Array.from(m.removedNodes));
        return nodes.length > 0 && nodes.every(n => n.classList && n.classList.contains('_cat-section'));
      });
      if (ours) return;
      clearTimeout(_t);
      _t = setTimeout(injectSection, 600);
    }).observe(main, { childList: true });
  }
  attach();
  setTimeout(injectSection, 1500);
  setTimeout(injectSection, 3000);

  // Refresh when AppSettings changes (cross-device sync)
  if (window.AppSettings && typeof window.AppSettings.onChange === 'function') {
    window.AppSettings.onChange(() => {
      const section = document.querySelector('._cat-section');
      if (section) {
        const coId = +section.dataset.coId;
        if (coId) refreshSection(section, coId);
      }
    });
  }

  // Programmatic file picker for the unified card (patch 199). Opens the OS file
  // dialog, uploads the chosen file pre-tagged with {year, kind}, and resolves
  // with the new attachment meta (or null if cancelled). kind ∈
  // 'skyrsla'|'reikningur'|'samningur'|undefined.
  function pickAttachment(coId, opts) {
    return new Promise(resolve => {
      if (!coId) { resolve(null); return; }
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '*/*';
      inp.style.display = 'none';
      document.body.appendChild(inp);
      let done = false;
      inp.addEventListener('change', async () => {
        done = true;
        const file = inp.files && inp.files[0];
        inp.remove();
        if (!file) { resolve(null); return; }
        const meta = await uploadAttachment(coId, file, opts || {});
        if (meta) {
          try { document.dispatchEvent(new CustomEvent('attachment-year-changed')); } catch (_) {}
          if (window.Toast && Toast.show) {
            const k = (opts && opts.kind) || '';
            Toast.show(k === 'skyrsla' ? '✓ Úttektarskýrsla tengd'
                     : k === 'reikningur' ? '✓ Reikningur tengdur'
                     : k === 'samningur' ? '✓ Samningur tengdur'
                     : '✓ Viðhengi tengt');
          }
        }
        resolve(meta);
      });
      // Safety: if the dialog is dismissed without choosing (no change event),
      // clean up the input on next focus.
      window.addEventListener('focus', function cleanup() {
        setTimeout(() => { if (!done && inp.parentNode) { inp.remove(); resolve(null); } window.removeEventListener('focus', cleanup); }, 400);
      });
      inp.click();
    });
  }

  window.CompanyAttachments = {
    list: getCompanyAttachments,
    upload: uploadAttachment,
    pick: pickAttachment,
    delete: deleteAttachment,
    openPreview: openPreview,
    download: downloadFile,
    getPublicUrl: getPublicUrl
  };

  console.log('[company-attachments] installed — 📎 Skjöl & skýrslur on company detail');
})();
/* === END COMPANY ATTACHMENTS v1 === */
