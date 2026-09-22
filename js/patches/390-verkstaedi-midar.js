/* === VERKSTÆÐI — MIÐAR (390) ==============================================
 *
 * 22.09.2026 (Agnar: „this is the other part of afgreiðsla, called verkstæði,
 * if you can make this … in a similar style"): Verkröð teiknuð í sama
 * Miðakerfi og Afgreiðslan (389) — hver viðskiptavinur er miði með rifflipa
 * (R-númer + biðtímastimpill + tegundarrönd), tækin eru smá-miðar, málmhausar
 * á VERK / SAMNINGSHAFAR og stálplata undir.
 *
 * AÐGERÐIR ÓBREYTTAR — aðeins útlitið er nýtt. Hver takki kallar nákvæmlega
 * sama fall og áður: Workshop.editVerk / addUnit / openDrog / deleteUnit /
 * openUnitModal / toggleUnit / sendGroupToAfgreidsla. Engin ný stöðubreyting.
 *
 * KRÓKAR ANNARRA PATCHA HALDA: 234 (🗑 Eyða verki) leitar að .bw-prow og les
 * verk-númerin úr onclick á .bw-send; 122 (Sækja inn úr fyrirtæki) leitar að
 * Samningshafar-titlinum (óbreyttur í 78); 269 (Komið úr þjónustu) notar sömu
 * .bw-row/.bw-tile klasa og fær því sama útlit í gegnum stílana hér.
 *
 * TENGING: 78 (wCustomerGroup) kallar VerkMidar.group() sé þessi skrá hlaðin,
 * annars teiknar 78 gamla spjaldið óbreytt.
 * ========================================================================== */
(() => {
  if (window.VerkMidar) return;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const pad2 = n => String(n).padStart(2, '0');

  // ── Biðtími (sömu mörk og 389: í dag · 1–7 · 8–14 · 15+) ────────────────────
  function dayKey(v) {
    if (!v) return '';
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (isNaN(d)) return s.slice(0, 10);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function ageDays(key) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key || '');
    if (!m) return 0;
    const t = new Date();
    return Math.max(0, Math.round((Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - Date.UTC(+m[1], +m[2] - 1, +m[3])) / 86400000));
  }
  const ageLabel = d => (!d ? 'í dag' : d + (d % 10 === 1 && d % 100 !== 11 ? ' dagur' : ' dagar'));
  const ageKind = d => (d <= 0 ? 'dag' : d <= 7 ? 'vika' : d <= 14 ? 'tvaer' : 'lengi');

  function numParts(n) {
    const s = String(n == null ? '' : n).replace(/-V\d+$/i, '');
    const m = /^([A-Za-z]+-0*)(\d+)$/.exec(s);
    return m ? { n0: m[1], n1: m[2] } : { n0: '', n1: s };
  }
  const fmtPhone = d => (d && d.length === 7 ? d.slice(0, 3) + ' ' + d.slice(3) : (d || ''));
  const typeColor = s => {
    try { return typeof window.SlokkTypeColor === 'function' ? window.SlokkTypeColor({ nafn: s }) : null; } catch (_) { return null; }
  };
  function stripe(cols) {
    const u = [];
    cols.forEach(c => { if (c && u.indexOf(c) === -1) u.push(c); });
    if (!u.length) return '';
    const step = 100 / u.length;
    return '--tbm-type:linear-gradient(to bottom,' + u.map((c, k) => esc(c) + ' ' + (k * step).toFixed(2) + '% ' + ((k + 1) * step).toFixed(2) + '%').join(',') + ')';
  }

  // ── Tákn (stroke-SVG í stað emoji) ─────────────────────────────────────────
  const S = (w, body, sw) => '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  const ICON = {
    pencil: S(15, '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    plus: S(15, '<path d="M12 5v14M5 12h14"/>', 2.4),
    file: S(15, '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>'),
    send: S(15, '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/>'),
    x: S(12, '<path d="M18 6 6 18M6 6l12 12"/>', 2.6),
    check: S(12, '<path d="M5 12.5l4.5 4.5L19 7.5"/>', 3.2),
    box: S(12, '<rect x="4" y="4" width="16" height="16" rx="3"/>', 2.4),
    ban: S(12, '<circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/>', 2.4),
    wrench: S(11, '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5z"/>', 2.2),
    note: S(15, '<path d="M4 4h16v12H8l-4 4z"/>'),
    phone: S(11, '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>', 2.4),
  };

  // ── Tækjaflís (sama merking og 78 renderUnitTiles) ─────────────────────────
  function tileLabel(unit, parseSvcName) {
    // 2026-08-17 (78): móttöku-tæki (TMP-…) bera oft hvorki type né size — leitt úr
    // unit.service; „× 20" og svigar síast burt.
    let typeSrc = String(unit.type || '').replace(/^—$/, '').trim();
    let sizeSrc = unit.size ? String(unit.size) : '';
    if (!typeSrc && unit.service && typeof parseSvcName === 'function') {
      const ps = parseSvcName(String(unit.service).replace(/[×x]\s*\d+/gi, '').replace(/\([^)]*\)/g, ''));
      if (ps.type) typeSrc = ps.type;
      if (!sizeSrc && ps.size) sizeSrc = ps.size;
    }
    const typeRaw = (typeSrc || '—').split(/\s+/).slice(0, 2).join(' ');
    return { label: typeRaw + (sizeSrc ? ' ' + sizeSrc : ''), color: typeColor(typeSrc + ' ' + sizeSrc + ' ' + String(unit.service || '')) };
  }
  function tilesHtml(jobs, h) {
    const items = [];
    jobs.forEach(j => h.live(j.units).forEach(u => items.push({ jobId: j.id, unit: u })));
    if (!items.length) return { html: '', colors: [] };
    const colors = [];
    const html = items.map(({ jobId, unit }) => {
      const isDone = unit.status === 'done';
      const isBroken = unit.status === 'broken';
      const cls = isDone ? 'yes' : (isBroken ? 'broken' : 'no');
      const txt = isDone ? ICON.check + 'Tilbúið' : (isBroken ? ICON.ban + 'Ónýtt' : ICON.box + 'Tilbúið');
      const tl = tileLabel(unit, h.parseSvcName);
      if (tl.color) colors.push(tl.color);
      const serialShort = String(unit.serial || '').replace(/^.*-/, '').slice(0, 8);
      const parts = Array.isArray(unit.parts) ? unit.parts : [];
      const partCount = parts.reduce((s, p) => s + (+p.qty || 1), 0);
      // Ónýtt tæki: flýtitakkinn opnar gluggann (viljandi) — annars víxlar hann Tilbúið.
      const chkClick = isBroken ? 'Workshop.openUnitModal(' + jobId + ',' + unit.id + ')' : 'Workshop.toggleUnit(' + jobId + ',' + unit.id + ')';
      return '<div class="bw-tile vkm-tile' + (isDone ? ' is-done' : '') + (isBroken ? ' is-broken' : '') + '"' +
          (tl.color ? ' style="--vkm-type:' + esc(tl.color) + '"' : '') +
          ' title="' + esc((unit.serial || '') + ' — ' + tl.label + (unit.service ? ' · ' + unit.service : '')) + '">' +
        '<button type="button" class="bw-tile-x" aria-label="Eyða tæki" title="Eyða tæki (fer í Eydd tæki)" onclick="event.stopPropagation();Workshop.deleteUnit(' + jobId + ',' + unit.id + ')">' + ICON.x + '</button>' +
        '<div class="bw-tile-body" role="button" tabindex="0" onkeydown="_cwKbAct(event)" title="Opna tækið" onclick="event.stopPropagation();Workshop.openUnitModal(' + jobId + ',' + unit.id + ')">' +
          '<div class="bw-tile-ty">' + esc(tl.label) + '</div>' +
          (serialShort ? '<div class="bw-tile-ser">' + esc(serialShort) + '</div>' : '') +
          '<div class="bw-tile-parts">' + (partCount ? ICON.wrench + partCount + ' ' + (partCount === 1 ? 'hlutur' : 'hlutir') : '') + '</div>' +
        '</div>' +
        '<button type="button" class="bw-chk ' + cls + '" onclick="event.stopPropagation();' + chkClick + '">' + txt + '</button>' +
      '</div>';
    }).join('');
    return { html: '<div class="bw-tiles">' + html + '</div>', colors };
  }

  // ── Viðskiptavinamiðinn — kallað úr 78 (wCustomerGroup) ────────────────────
  // h: { live, digitsOnly, baseNum, groupStaffNote, parseSvcName }
  function group(statusKey, co, h) {
    const jobs = co.jobs || [];
    const first = jobs[0] || {};
    const pct = co.totalUnits ? Math.round(co.doneUnits / co.totalUnits * 100) : 0;
    const ready = pct === 100;
    const jobIds = jobs.map(j => j.id).join(',');
    const sales = new Set(jobs.map(j => h.baseNum(j.num)));
    const np = sales.size > 1 ? { n0: '', n1: sales.size + ' sölur' } : numParts(first.num);
    const keys = jobs.map(j => dayKey(j.dropoff || j.created_at)).filter(Boolean).sort();
    const days = ageDays(keys[0] || '');
    const phoneJob = jobs.find(j => h.digitsOnly(j.phone));
    const phone = phoneJob ? fmtPhone(h.digitsOnly(phoneJob.phone)) : '';
    const staffNote = h.groupStaffNote ? h.groupStaffNote(co) : '';
    const t = tilesHtml(jobs, h);
    const st = stripe(t.colors);
    return '<div class="vkm-wrap">' +
      '<div class="bw-row vkm-row"' + (st ? ' style="' + st + '"' : '') + '>' +
        '<div class="vkm-stub">' +
          '<div class="vkm-num">' + (np.n0 ? '<span class="vkm-num0">' + esc(np.n0) + '</span>' : '') + esc(np.n1) + '</div>' +
          '<div class="vkm-age vkm-age--' + ageKind(days) + '"><i aria-hidden="true"></i>' + ageLabel(days) + '</div>' +
        '</div>' +
        '<div class="vkm-main">' +
          '<div class="bw-row-top">' +
            '<div class="bw-cinfo">' +
              '<div class="bw-cname-row">' +
                '<div class="bw-cname">' + esc(co.name || '—') + '</div>' +
                (jobs.length > 1 ? '<span class="vkm-chip">' + jobs.length + ' verk</span>' : '') +
              '</div>' +
              '<div class="bw-cmeta"><span class="vkm-done">' + co.doneUnits + '/' + co.totalUnits + ' lokið</span>' +
                (phone ? '<span class="vkm-phone" title="Sími">' + ICON.phone + esc(phone) + '</span>' : '') +
              '</div>' +
              '<div class="vkm-tools">' +
                '<button type="button" class="bw-edit-verk vkm-ic" title="Breyta verki (nafn / sími)" aria-label="Breyta verki" onclick="event.stopPropagation();Workshop.editVerk(\'' + jobIds + '\')">' + ICON.pencil + '</button>' +
                '<button type="button" class="bw-edit-verk vkm-ic" title="Bæta við tæki" aria-label="Bæta við tæki" onclick="event.stopPropagation();Workshop.addUnit(' + (first.id || 0) + ')">' + ICON.plus + '</button>' +
                '<button type="button" class="bw-edit-verk vkm-ic" title="Opna Drög (breyta / eyða reikningi)" aria-label="Opna Drög" onclick="event.stopPropagation();Workshop.openDrog(\'' + esc(first.num || '') + '\')">' + ICON.file + '</button>' +
              '</div>' +
            '</div>' +
            t.html +
          '</div>' +
          (staffNote ? '<div class="bw-cnote vkm-note">' + ICON.note + '<span><b>Athugasemd:</b> ' + esc(staffNote) + '</span></div>' : '') +
          '<div class="bw-prow">' +
            '<div class="bw-prog' + (ready ? ' full' : '') + '" role="img" aria-label="' + co.doneUnits + ' af ' + co.totalUnits + ' tækjum tilbúin"><div style="width:' + pct + '%"></div></div>' +
            '<span class="vkm-pct">' + co.doneUnits + '/' + co.totalUnits + '</span>' +
            '<button type="button" class="bw-send' + (ready ? ' ready' : '') + '" onclick="event.stopPropagation();Workshop.sendGroupToAfgreidsla([' + jobIds + '])">' + ICON.send + 'Senda í afgreiðslu</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  window.VerkMidar = { group };

  // ── Stílar — #view-workshop í hverri reglu (vinnur 78 _bw_css og 230/240) ──
  if (!document.getElementById('_vkm-css')) {
    const V = '#view-workshop ';
    const MONO = '"JetBrains Mono",ui-monospace,monospace';
    const DISPLAY = '"Playfair Display",Georgia,serif';
    const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
    const GREEN_METAL = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
    const RED_METAL = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';
    const STEEL = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
    const TRASH = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='3 6 5 6 21 6'/%3E%3Cpath d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/%3E%3Cline x1='10' y1='11' x2='10' y2='17'/%3E%3Cline x1='14' y1='11' x2='14' y2='17'/%3E%3C/svg%3E\")";
    const css = [
      // síðuhausinn: Verkröð í letri Kröfu yfirlits. 313 þvingar titilinn dökkan (#view-workshop
      // .bw-page-h1) en hann situr á dökkgráu (~#3a3d41 undir borðanum) → 1,7:1. Hvítt = 11:1.
      // „html body" vinnur 313 óháð röð blaðanna.
      'html body ' + V + '.bw-page-h1{font-family:' + DISPLAY + '!important;font-size:32px!important;font-weight:800!important;letter-spacing:-.02em!important;color:#fff!important;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 8px rgba(0,0,0,.45)!important}',
      'html body ' + V + '.bw-page-sub{font-family:' + MONO + '!important;font-size:12.5px!important;color:#d5dbe6!important;-webkit-font-smoothing:antialiased}',
      'html body ' + V + '.bw-page-sub b{color:#fff!important;font-weight:700}',
      // spjöldin tvö: málmhaus + stálplata (sama og dálkarnir í Afgreiðslu)
      V + '.bw-card{padding:0!important;overflow:hidden;border-radius:14px!important;border:1px solid rgba(20,24,34,.22)!important;background:#fff!important;box-shadow:0 14px 32px -16px rgba(0,0,0,.6)!important}',
      V + '.bw-card>div:not(.bw-chd){background:' + STEEL + ';padding:10px 12px 14px;gap:8px!important}',
      V + '.bw-chd,' + V + '.bw-shd{position:relative;margin:0!important;padding:15px 18px 14px!important;background:' + METAL + '!important;border-bottom:1px solid #000;-webkit-font-smoothing:antialiased}',
      V + '.bw-chd b,' + V + '.bw-shd-t{display:inline-flex;align-items:center;gap:9px;font-family:' + MONO + '!important;font-size:11.5px!important;font-weight:700!important;letter-spacing:.2em!important;text-transform:uppercase;color:#f6b545!important}',
      V + '.bw-chd b::before,' + V + '.bw-shd-t::before{content:"";flex:none;width:8px;height:8px;border-radius:50%;background:#f6b545;box-shadow:0 0 0 3px rgba(246,181,69,.18),0 0 12px rgba(246,181,69,.8)}',
      V + '.bw-shd-t{color:#8fb6ff!important}' + V + '.bw-shd-t::before{background:#8fb6ff;box-shadow:0 0 0 3px rgba(143,182,255,.18),0 0 12px rgba(143,182,255,.8)}',
      V + '.bw-cnum,' + V + '.bw-shd-n{font-family:' + DISPLAY + '!important;font-size:17px!important;font-weight:700!important;color:#e8ecf2!important;letter-spacing:-.005em}',
      V + '.bw-shd ._sr-btn{flex-basis:100%;height:40px;margin-top:4px!important;border-radius:10px!important;font-size:13px!important;font-weight:700!important}',
      V + '.bw-sh-col{border-radius:14px!important;border:1px solid rgba(20,24,34,.22)!important;box-shadow:0 14px 32px -16px rgba(0,0,0,.6)!important}',
      V + '.bw-sh-body{background:' + STEEL + ';padding:12px 12px 14px!important}',
      V + '#_vk-loaned>div:first-child>span:first-child{font-family:' + MONO + '!important;font-size:11px!important;letter-spacing:.14em!important;color:#3a4250!important}',
      // miðinn (viðskiptavinur)
      V + '.vkm-wrap{position:relative;margin-bottom:10px;filter:drop-shadow(0 1px 1px rgba(15,20,30,.22)) drop-shadow(0 6px 12px rgba(15,20,30,.12))}',
      V + '.bw-row.vkm-row{--vkm-stub:88px;display:grid;grid-template-columns:var(--vkm-stub) minmax(0,1fr);margin:0!important;padding:0!important;border:0!important;border-radius:12px!important;overflow:hidden;background:#fff!important;box-shadow:inset 0 0 0 1px rgba(20,24,34,.07)!important;' +
        '-webkit-mask:radial-gradient(circle at var(--vkm-stub) 0,transparent 7px,#000 7.5px) top/100% 51% no-repeat,radial-gradient(circle at var(--vkm-stub) 100%,transparent 7px,#000 7.5px) bottom/100% 51% no-repeat;' +
        'mask:radial-gradient(circle at var(--vkm-stub) 0,transparent 7px,#000 7.5px) top/100% 51% no-repeat,radial-gradient(circle at var(--vkm-stub) 100%,transparent 7px,#000 7.5px) bottom/100% 51% no-repeat}',
      V + '.vkm-wrap:hover .vkm-row{box-shadow:inset 0 0 0 1px rgba(201,42,42,.45)!important}',
      V + '.vkm-stub{position:relative;display:flex;flex-direction:column;gap:6px;padding:14px 0 12px 12px;background:#f4f6f9;border-right:1.5px dashed #c3cad5;min-width:0}',
      V + '.vkm-stub::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--tbm-type,none)}',
      V + '.vkm-num{font-family:' + MONO + ';font-size:13.5px;font-weight:700;letter-spacing:-.02em;line-height:1.2;color:#11141c;white-space:nowrap;overflow:hidden}',
      V + '.vkm-num0{color:#a1a9b6}',
      V + '.vkm-age{display:flex;align-items:center;gap:5px;font-family:' + MONO + ';font-size:11px;font-weight:700;line-height:1.2;white-space:nowrap}',
      V + '.vkm-age i{flex:none;width:6px;height:6px;border-radius:50%}',
      V + '.vkm-age--dag{color:#0b6b3a}' + V + '.vkm-age--dag i{background:#16783f}',
      V + '.vkm-age--vika{color:#4a5363}' + V + '.vkm-age--vika i{background:#8a93a3}',
      V + '.vkm-age--tvaer{color:#845400}' + V + '.vkm-age--tvaer i{background:#e0a93e}',
      V + '.vkm-age--lengi{color:#b42318}' + V + '.vkm-age--lengi i{background:#c92a2a}',
      V + '.vkm-main{min-width:0;padding:12px 14px 12px 16px}',
      V + '.vkm-row .bw-row-top{gap:14px}',
      V + '.vkm-row .bw-cinfo{flex:1 1 170px;width:auto;min-width:0}',
      V + '.bw-cname{font-size:15px!important;font-weight:600!important;color:#11141c!important}',
      V + '.vkm-chip{flex:none;padding:2px 7px;border-radius:6px;background:#1d1f24;font-family:' + MONO + ';font-size:10.5px;font-weight:700;color:#fff}',
      V + '.vkm-row .bw-cmeta{display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px;margin-top:4px;font-size:12px;color:#5b6472}',
      V + '.vkm-done{font-weight:500;color:#2b313c}',
      V + '.vkm-phone{display:inline-flex;align-items:center;gap:4px;font-family:' + MONO + ';font-size:11.5px;color:#3a4250}',
      V + '.vkm-tools{display:flex;gap:6px;margin-top:10px}',
      V + '.bw-edit-verk.vkm-ic{width:34px;height:34px;padding:0;display:inline-flex;align-items:center;justify-content:center;opacity:1;border-radius:9px;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);color:#3a4250;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);cursor:pointer}',
      V + '.bw-edit-verk.vkm-ic:hover{background:linear-gradient(180deg,#fff 0%,#e9ecf2 100%);border-color:rgba(201,42,42,.45)}',
      // tækjaflísarnar = smá-miðar (líka í Komið úr þjónustu, 269)
      V + '.bw-tiles{gap:8px!important}',
      V + '.bw-tile{width:100px!important;border:1px solid rgba(20,24,34,.13)!important;border-radius:9px!important;background:#fff!important;box-shadow:0 1px 2px rgba(15,20,30,.1),0 4px 10px -6px rgba(15,20,30,.25)!important}',
      V + '.bw-tile.vkm-tile{box-shadow:inset 3px 0 0 var(--vkm-type,transparent),0 1px 2px rgba(15,20,30,.1),0 4px 10px -6px rgba(15,20,30,.25)!important}',
      V + '.bw-tile:hover{transform:translateY(-2px);border-color:rgba(201,42,42,.45)!important}',
      V + '.bw-tile-x{width:24px!important;height:24px!important;background:transparent!important;color:#8a93a3!important;border-radius:0 0 0 7px!important}',
      V + '.bw-tile-x:hover{background:rgba(201,42,42,.12)!important;color:#b42318!important}',
      V + '.bw-tile-body{padding:8px 16px 6px 9px!important;text-align:left!important}',
      V + '.bw-tile-ty{font-size:11px!important;font-weight:600!important;color:#11141c!important}',
      V + '.bw-tile-ser{font-family:' + MONO + '!important;font-size:10px!important;font-weight:500;color:#6b7483!important;margin-top:3px!important}',
      V + '.bw-tile-parts{display:flex;align-items:center;gap:3px;min-height:13px!important;margin-top:3px!important;font-size:10px!important;font-weight:600!important;color:#0b6b3a!important}',
      V + '.bw-chk{display:flex!important;align-items:center;justify-content:center;gap:5px;height:28px;padding:0 4px!important;border:0!important;border-top:1px solid rgba(20,24,34,.1)!important;font-family:"IBM Plex Sans",system-ui,sans-serif!important;font-size:11px!important;font-weight:700!important;letter-spacing:.01em}',
      V + '.bw-chk.no{background:linear-gradient(180deg,#fdfdfe 0%,#e8ebf1 100%)!important;color:#3a4250!important}',
      V + '.bw-chk.no:hover{color:#0b6b3a!important}',
      V + '.bw-chk.yes{background:' + GREEN_METAL + '!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)}',
      V + '.bw-chk.broken{background:' + RED_METAL + '!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)}',
      // athugasemd starfsmanns
      V + '.bw-cnote.vkm-note{display:flex;align-items:flex-start;gap:8px;margin:10px 0 0!important;padding:9px 11px!important;background:#fff8e6!important;border:1px solid #f1d58a!important;border-radius:9px!important;font-size:12.5px!important;color:#5c3f00!important;line-height:1.45}',
      V + '.bw-cnote.vkm-note svg{flex:none;margin-top:1px;color:#b27b1c}',
      // framvinda + Senda í afgreiðslu (grænn málmur þegar allt er tilbúið)
      V + '.vkm-row .bw-prow{gap:10px;margin-top:12px}',
      V + '.bw-prog{height:8px!important;border-radius:99px!important;background:#dfe3ea!important;box-shadow:inset 0 1px 2px rgba(0,0,0,.25)}',
      V + '.bw-prog>div{border-radius:99px;background:linear-gradient(180deg,#ffe0a0 0%,#e0a93e 40%,#935f0d 60%,#b27b1c 100%)!important}',
      V + '.bw-prog.full>div{background:linear-gradient(180deg,#7fe0a8 0%,#23a35a 40%,#0b5a2e 60%,#137a41 100%)!important}',
      V + '.vkm-pct{flex:none;font-family:' + MONO + ';font-size:11.5px;font-weight:700;color:#3a4250}',
      V + '.bw-send{display:inline-flex;align-items:center;gap:8px;height:40px!important;padding:0 15px!important;border-radius:10px!important;border:1px solid #000!important;background:' + METAL + '!important;color:#eef1f4!important;font-size:13px!important;font-weight:700!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 2px 6px rgba(0,0,0,.35)!important}',
      V + '.bw-send.ready{border-color:rgba(52,168,98,.55)!important;background:' + GREEN_METAL + '!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3)!important}',
      V + '.bw-send:hover{filter:brightness(1.2)}',
      // 🗑 frá 234 → silfurtakki með teiknuðu rusli (ekkert emoji)
      V + '._vsd-del{width:40px!important;height:40px!important;display:inline-flex!important;align-items:center;justify-content:center;border-radius:10px!important;border:1px solid rgba(20,24,34,.16)!important;background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)!important;color:#b42318!important;font-size:0!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)}',
      V + '._vsd-del::before{content:"";width:16px;height:16px;background:currentColor;-webkit-mask:' + TRASH + ' center/contain no-repeat;mask:' + TRASH + ' center/contain no-repeat}',
      V + '._vsd-del:hover{border-color:rgba(201,42,42,.5)!important}',
      // mjór skjár: rifflipinn mjórri
      '@media (max-width:640px){' + V + '.bw-row.vkm-row{--vkm-stub:74px}' + V + '.vkm-num{font-size:12px}' + V + '.vkm-main{padding:10px 10px 10px 12px}}',
    ].join('\n');
    const st = document.createElement('style');
    st.id = '_vkm-css';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  // Borðið gæti hafa teiknast áður en þessi skrá hlóðst — teikna aftur einu sinni.
  setTimeout(() => {
    try {
      if (document.querySelector('#view-workshop .bw-row') && !document.querySelector('#view-workshop .vkm-row') && window.Workshop && Workshop.render) Workshop.render();
    } catch (_) {}
  }, 0);

  console.log('[patch-390] Verkstæði — miðar');
})();
/* === END VERKSTÆÐI — MIÐAR === */
