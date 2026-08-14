/* === SNÖGGSKOÐUN — 👁 á Skipulagsborðs-spjaldi (Pakki 5 v2, 2026-08-14) ===
 *
 * Gluggi ofan á borðinu með ÖLLU sem kerfið veit um málið og fyrirtækið:
 * staðsetning (líka lesin úr texta málsins), öll símanúmer (líka grafin í
 * nótum, regex), áætlaður tækjafjöldi MEÐ uppruna, samningur, öll samskipta-
 * sagan, tengdir staðir, staða í kerfinu og sjálfvirk samantekt.
 *
 * LES-EINGÖNGU — engin UPDATE/INSERT. Beint á Supabase (DB.sb), hver tafla
 * sótt EINU SINNI með .in() yfir öll málin. Klikki fyrirspurn opnast glugginn
 * samt með því sem náðist og „⚠ náði ekki í X" — aldrei auður gluggi.
 *
 * Prentun: 🖨 inni í glugganum — @media print felur allt nema .sb-quickview.
 * „Prenta öll spjöld" á Skipulagsborðinu opnar SAMA glugga með öll spjöldin
 * stöfluð, page-break á milli.
 *
 * API: window.Snoggskodun.open(jobs) — jobs = [{beidni_id} | {nafn}]
 */
(() => {
  if (window.Snoggskodun) return;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const d10 = s => String(s || '').replace(/\D/g, '');
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const dt = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; };
  const kr = n => n == null ? '—' : String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';
  const dash = '<span class="qv-empty">—</span>';
  const V = v => (v == null || String(v).trim() === '') ? dash : esc(v);
  const MAN = ['', 'janúar','febrúar','mars','apríl','maí','júní','júlí','ágúst','september','október','nóvember','desember'];
  const getSB = () => (window.DB && window.DB.sb) || null;

  // ── CSS (skjár + prent) ────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('sb-qv-css')) return;
    const s = document.createElement('style');
    s.id = 'sb-qv-css';
    s.textContent = `
      #sb-qv-backdrop { position:fixed; inset:0; background:rgba(10,12,18,.55); z-index:100080; }
      .sb-quickview { position:fixed; top:4vh; left:50%; transform:translateX(-50%);
        width:min(880px, 94vw); max-height:92vh; overflow-y:auto; z-index:100081;
        background:#fff; color:#16181d; border-radius:14px;
        box-shadow:0 30px 80px rgba(0,0,0,.45); font-size:13px; line-height:1.5; }
      .sb-quickview h1 { margin:0; font-size:19px; letter-spacing:-.01em; }
      .sb-quickview h2 { font-size:11px; text-transform:uppercase; letter-spacing:.07em;
        border-bottom:1.5px solid #16181d; padding-bottom:2px; margin:14px 0 6px; color:#16181d; }
      .sb-quickview table { width:100%; border-collapse:collapse; font-size:12.5px; }
      .sb-quickview th { text-align:left; font-size:10px; text-transform:uppercase; color:#64748b;
        border-bottom:1px solid #cbd5e1; padding:2px 6px 2px 0; }
      .sb-quickview td { padding:3px 6px 3px 0; border-bottom:1px solid #eef2f7; vertical-align:top; }
      .sb-quickview .qv-kv td:first-child { color:#64748b; width:36%; padding-right:10px; }
      .sb-quickview .qv-empty { color:#b3b8c0; }
      .sb-quickview .qv-warn { color:#b45309; font-weight:700; }
      .sb-quickview .qv-note { white-space:pre-wrap; border-left:3px solid #cbd5e1; padding:3px 0 3px 10px; margin:4px 0; }
      .sb-quickview .qv-big-missing { border:3px solid #b91c1c; border-radius:10px; padding:12px;
        margin:10px 0; font-size:16px; font-weight:800; color:#b91c1c; text-align:center; }
      .sb-quickview .qv-badge { display:inline-block; padding:1px 8px; border-radius:99px;
        border:1px solid #94a3b8; font-size:10.5px; margin-left:6px; vertical-align:2px; }
      .sb-quickview .qv-sheet { padding:16px 20px 20px; }
      .sb-quickview .qv-sheet + .qv-sheet { border-top:3px double #94a3b8; }
      .sb-quickview a { color:#1d4ed8; text-decoration:none; font-weight:700; }
      .sb-quickview .qv-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0 20px; }
      @media (max-width:700px){ .sb-quickview .qv-grid2 { grid-template-columns:1fr; } }
      @media print {
        @page { size:A4; margin:12mm; }
        body > *:not(.sb-quickview) { display:none !important; }
        .sb-quickview { position:static; transform:none; box-shadow:none; max-height:none;
          overflow:visible; width:auto; background:#fff; color:#000; font-size:10.5pt; border-radius:0; }
        .sb-quickview .noprint { display:none !important; }
        .sb-quickview .qv-sheet { page-break-after:always; border:none; }
        .sb-quickview .qv-sheet:last-child { page-break-after:auto; }
        .sb-quickview a { color:#000; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Textagreining úr málinu ────────────────────────────────────────────────
  // Íslensk 7 stafa símanúmer grafin í texta („Hringja í Rakel 8633025").
  // Lookbehind/ahead svo bútar úr kennitölum (6+4) og lengri talnarunum sleppi.
  function phonesFromText(txt) {
    const out = [];
    const re = /(?<!\d)([2-8]\d{2})[- ]?(\d{4})(?!\d)/g;
    let m;
    while ((m = re.exec(String(txt || '')))) out.push(m[1] + m[2]);
    return [...new Set(out)];
  }
  // Heimilisfang úr texta málsins („Kjarrhólmi 18, 200 Kópavogur", „Lautargata 5").
  function addrFromText(txt) {
    const m = String(txt || '').match(/([A-ZÁÉÍÓÚÝÆÖÞ][a-záéíóúýæöþð]{2,}(?:\s+[a-záéíóúýæöþð]{2,})?\s+\d{1,3}[a-dA-D]?(?:\s*,\s*\d{3}\s+[A-ZÁÉÍÓÚÝÆÖÞ][a-záéíóúýæöþð.]+)?)/);
    return m ? m[1].trim() : '';
  }
  // Tækjavísbending í texta („Um 16 tæki", „51 íbúð + sameign", „2-3 reykskynjara").
  function taekiFromText(txt) {
    const m = String(txt || '').match(/((?:um\s+)?\d{1,3}(?:\s*[-–]\s*\d{1,3})?\s*(?:stk\.?\s*)?(?:ný\s+|nýja\s+)?(?:tæki|slökkvitæki|reykskynjar\w*|íbúð\w*)(?:\s*\+\s*sameign)?)/i);
    return m ? m[1].replace(/\s+/g, ' ').trim() : '';
  }

  // ── Gagnasókn — hver tafla EINU SINNI yfir öll málin ──────────────────────
  async function fetchAll(jobsSpec, warns) {
    const sb = getSB();
    if (!sb) throw new Error('DB.sb vantar');
    async function q(label, p) {
      try { const r = await p; if (r.error) throw r.error; return r.data || []; }
      catch (e) { console.warn('[snoggskodun]', label, e); warns.push(label); return []; }
    }
    const jobs = [];
    const ids = jobsSpec.filter(j => j.beidni_id != null).map(j => String(j.beidni_id));
    let beidnir = [];
    if (ids.length) {
      beidnir = await q('þjónustubeiðnir', sb.from('thjonustubeidni').select('*').in('id', ids));
      beidnir.sort((a, b) => ids.indexOf(String(a.id)) - ids.indexOf(String(b.id)));
      beidnir.forEach(b => {
        const spec = jobsSpec.find(s => String(s.beidni_id) === String(b.id)) || {};
        jobs.push({ beidni: b, baseId: b.customer_base_id || null, cardTitle: spec.card_title || '', cardName: spec.card_name || '' });
      });
    }
    jobsSpec.filter(j => j.beidni_id == null && j.nafn).forEach(j =>
      jobs.push({ nameOnly: j.nafn, cardTitle: j.card_title || '', cardName: j.card_name || '' }));

    // Nafnamatch fyrir beiðnir án base + nafn-spjöld (ILIKE, eitt í einu — fá).
    // Verður að þola tvö lík nöfn (Kjarrhólmi 14 OG 18 bæði á borðinu):
    // nákvæm samsvörun (fold) vinnur ALLTAF óháð röð niðurstaðna; margar
    // niðurstöður án nákvæmrar samsvörunar → EKKI giskað (notFound).
    const pickByName = (list, name) => {
      const ex = (list || []).find(x => fold(x.nafn) === fold(name));
      return ex || ((list || []).length === 1 ? list[0] : null);
    };
    for (const j of jobs) {
      const name = j.nameOnly || (j.beidni && !j.baseId ? (j.beidni.customer_nafn || '').trim() : '');
      if (!name || j.baseId) continue;
      const like = '%' + name.replace(/[%_,]/g, ' ').trim() + '%';
      const fy = pickByName(await q('nafnaleit', sb.from('fyrirtaeki').select('id,nafn,customer_base_id').is('deleted_at', null).ilike('nafn', like).limit(5)), name);
      if (fy) { j.fyrId = fy.id; j.baseId = fy.customer_base_id || null; continue; }
      const cb = pickByName(await q('nafnaleit (base)', sb.from('customers_base').select('id,nafn').ilike('nafn', like).limit(5)), name);
      if (cb) { j.baseId = cb.id; continue; }
      j.notFound = true;
    }
    const directFyrIds = jobs.filter(j => j.fyrId).map(j => j.fyrId);

    const baseIds = [...new Set(jobs.map(j => j.baseId).filter(x => x != null))];
    const [bases, sitesA, sitesB] = await Promise.all([
      baseIds.length ? q('customers_base', sb.from('customers_base').select('*').in('id', baseIds)) : [],
      baseIds.length ? q('staðir', sb.from('fyrirtaeki').select('*').in('customer_base_id', baseIds).is('deleted_at', null)) : [],
      directFyrIds.length ? q('staðir (beint)', sb.from('fyrirtaeki').select('*').in('id', directFyrIds)) : [],
    ]);
    const sites = [...sitesA];
    sitesB.forEach(s => { if (!sites.find(x => x.id === s.id)) sites.push(s); });

    for (const j of jobs) {
      if (j.notFound) continue;
      j.base = bases.find(b => b.id === j.baseId) || null;
      j.sites = sites.filter(s => j.baseId != null && s.customer_base_id === j.baseId);
      if (j.fyrId) { const f = sites.find(s => s.id === j.fyrId); if (f && !j.sites.includes(f)) j.sites.push(f); }
      const nm = fold((j.beidni && j.beidni.customer_nafn) || j.nameOnly || '');
      j.focus = (j.fyrId ? j.sites.find(s => s.id === j.fyrId) : null)
        || (j.sites.length === 1 ? j.sites[0] : null)
        || (nm ? j.sites.find(s => fold(s.nafn) === nm) : null)
        || (nm ? j.sites.find(s => fold(s.nafn).includes(nm) || nm.includes(fold(s.nafn))) : null)
        || null;
    }

    const fyrIds = [...new Set(sites.map(s => s.id))];
    const kts = [...new Set([].concat(bases.map(b => b.kennitala), sites.map(s => s.kennitala)).filter(Boolean)
      .flatMap(k => { const d = d10(k); return d.length === 10 ? [k, d, d.slice(0, 6) + '-' + d.slice(6)] : [k]; }))];
    const names = [...new Set([].concat(bases.map(b => b.nafn), sites.map(s => s.nafn)).filter(Boolean))];

    const [uttA, uttB, repFacts, invFacts, skMan, docs, cinfoKt, cinfoNm, contacts, prevAll, samnA, samnB] = await Promise.all([
      baseIds.length ? q('tæki (base)', sb.from('uttaeki').select('id,type,size,next_insp,client,customer_base_id').in('customer_base_id', baseIds)) : [],
      names.length ? q('tæki (nafn)', sb.from('uttaeki').select('id,type,size,next_insp,client,customer_base_id').in('client', names)) : [],
      fyrIds.length ? q('skýrslu-fakta', sb.from('arsskodun_report_facts').select('fyrirtaeki_id,report_year,inspect_month,total_devices,equipment').in('fyrirtaeki_id', fyrIds)) : [],
      fyrIds.length ? q('reikninga-fakta', sb.from('uttekt_reikningur_facts').select('fyrirtaeki_id,invoice_date,invoice_number,total_devices').in('fyrirtaeki_id', fyrIds).order('invoice_date', { ascending: false })) : [],
      fyrIds.length ? q('skoðunarmánuður', sb.from('v_skodunar_manudur').select('fyrirtaeki_id,inspect_month,heimild').in('fyrirtaeki_id', fyrIds)) : [],
      fyrIds.length ? q('skjöl', sb.from('customer_documents').select('fyrirtaeki_id,doc_type,year,invoice_number,drive_file_id').in('fyrirtaeki_id', fyrIds).order('year', { ascending: false })) : [],
      kts.length ? q('customer_info', sb.from('customer_info').select('*').in('kennitala', kts)) : [],
      names.length ? q('customer_info (nafn)', sb.from('customer_info').select('*').in('customer_name', names)) : [],
      kts.length ? q('tengiliðir', sb.from('charlize_contacts').select('kennitala,netfang,heiti,hlutverk,sidast_sest').in('kennitala', kts)) : [],
      baseIds.length ? q('fyrri mál', sb.from('thjonustubeidni').select('id,title,created_at,status,flokkur,customer_base_id,notes').in('customer_base_id', baseIds).is('deleted_at', null).order('created_at', { ascending: false })) : [],
      fyrIds.length ? q('samningar', sb.from('thjonustusamningar').select('*').in('company_id', fyrIds)) : [],
      kts.length ? q('samningar (kt)', sb.from('thjonustusamningar').select('*').in('kennitala', kts)) : [],
    ]);
    const utt = [...uttA]; uttB.forEach(u => { if (!utt.find(x => x.id === u.id)) utt.push(u); });
    const cinfo = [...cinfoKt]; cinfoNm.forEach(c => { if (!cinfo.includes(c)) cinfo.push(c); });
    const samningar = [...samnA]; samnB.forEach(s => { if (!samningar.find(x => x.id === s.id)) samningar.push(s); });

    return { jobs, utt, repFacts, invFacts, skMan, docs, cinfo, contacts, prevAll, samningar };
  }

  // ── Teikna eitt „blað" per mál ────────────────────────────────────────────
  function kv(rows) {
    return '<table class="qv-kv">' + rows.map(r =>
      '<tr><td>' + esc(r[0]) + '</td><td>' + (r[1] == null || r[1] === '' ? dash : r[1]) + '</td></tr>').join('') + '</table>';
  }
  function sheet(j, D) {
    const b = j.beidni || null;
    const caseText = b ? [b.title, b.notes, b.summary].filter(Boolean).join('\n') : '';
    // Spjaldið sjálft er heimild: 9 af 11 spjöldum bera töluna/símann/götuna
    // í EIGIN titli („Um 16 tæki") — hann leitast eins og málstextinn en
    // merkist „úr spjaldinu" til aðgreiningar.
    const cardText = [j.cardTitle, j.cardName].filter(Boolean).join('\n');
    const cardTitleBlock = j.cardTitle
      ? '<div class="qv-note" style="border-color:#e0a93e">📋 ' + esc(j.cardTitle) + ' <span class="qv-badge">af spjaldinu</span></div>'
      : '';

    if (j.notFound) {
      const phAll = [...new Set([...phonesFromText(caseText).map(p => [p, 'úr málinu']), ...phonesFromText(cardText).map(p => [p, 'úr spjaldinu'])].map(x => x.join('|')))].map(s => s.split('|'));
      return '<div class="qv-sheet"><div class="qv-big-missing">EKKI TIL Í KERFINU — þarf að stofna</div>' +
        '<h1>' + esc((b && b.customer_nafn) || j.cardName || j.nameOnly || '?') + '</h1>' +
        cardTitleBlock +
        '<h2>Allt sem stendur í málinu' + (j.cardTitle ? ' og á spjaldinu' : '') + '</h2>' + kv([
          ['Titill', esc((b && b.title) || '')],
          ['Barst', b ? dt(b.created_at) : ''],
          ['Staða', esc((b && b.status) || '')],
          ['Nótur', b && b.notes ? '<div class="qv-note">' + esc(b.notes) + '</div>' : ''],
          ['Símanúmer', phAll.map(p => '<a href="tel:' + p[0] + '">' + p[0].slice(0, 3) + '-' + p[0].slice(3) + '</a> <span class="qv-badge">' + p[1] + '</span>').join(' · ')],
          ['Staðsetning', esc(addrFromText(caseText) || addrFromText(cardText))],
          ['Tækjavísbending', esc(taekiFromText(caseText) || taekiFromText(cardText))],
        ]) + '</div>';
    }

    const f = j.focus, base = j.base;
    const nafn = (f && f.nafn) || (base && base.nafn) || (b && b.customer_nafn) || '?';
    const kt = (f && f.kennitala) || (base && base.kennitala) || '';
    const myKts = k => kt && d10(k) === d10(kt);
    const myFyrIds = new Set(j.sites.map(s => s.id));
    const focusIds = f ? [f.id] : [...myFyrIds];
    const multi = j.sites.length > 1;
    const ageDays = b ? Math.max(0, Math.round((Date.now() - new Date(b.created_at)) / 864e5)) : null;

    // Haus
    let h = '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">' +
      '<div><h1>' + esc(nafn) + '</h1><div style="color:#475569;margin-top:2px">kt ' + V(kt) +
        (b ? ' · barst ' + dt(b.created_at) + ' <b>(' + ageDays + (ageDays === 1 ? ' dagur' : ' dagar') + ')</b>' : '') +
        (b && b.flokkur ? '<span class="qv-badge">' + esc(b.flokkur) + '</span>' : '') +
        (b && (b.priority >= 3 || b.important) ? '<span class="qv-badge" style="border-color:#dc2626;color:#dc2626;font-weight:800">❗ forgangur</span>' : '') +
      '</div></div></div>' +
      (b ? '<div style="font-size:14.5px;font-weight:700;margin-top:6px">' + esc(b.title || '(án titils)') + '</div>' : '');

    // 📍 Staðsetning — má aldrei vera tóm ef nokkur leið er að finna gildið.
    let addr = (f && [f.heimilisfang, f.postnumer].filter(Boolean).join(', ')) || (base && base.heimilisfang) || '';
    let addrSrc = '';
    if (!addr) { const t = addrFromText(caseText); if (t) { addr = t; addrSrc = ' <span class="qv-warn">(úr málinu, ekki skráð)</span>'; } }
    if (!addr) { const t = addrFromText(cardText); if (t) { addr = t; addrSrc = ' <span class="qv-warn">(úr spjaldinu, ekki skráð)</span>'; } }
    h += '<h2>📍 Staðsetning</h2><div style="font-size:14px;font-weight:700">' + (addr ? esc(addr) + addrSrc : dash + ' <span class="qv-warn">— engin staðsetning finnanleg</span>') + '</div>';

    // 📞 Hringja fyrst? — öll númer með uppruna, tel:-hlekkir.
    const phones = [];
    const seen = new Set();
    const push = (src, num) => { const d = d10(num); if (d.length === 7 && !seen.has(d)) { seen.add(d); phones.push([src, d]); } };
    for (const s of (f ? [f] : j.sites)) { push(s.nafn + ' · sími', s.simi); push(s.nafn + ' · farsími', s.farsimi); }
    if (base) push('grunnskrá', base.simi);
    const ci = D.cinfo.find(c => (c.kennitala && myKts(c.kennitala)) || (c.customer_name && fold(c.customer_name) === fold(nafn)));
    if (ci) push('customer_info', ci.contact_phone);
    phonesFromText(caseText).forEach(p => push('úr málinu', p));
    phonesFromText(cardText).forEach(p => push('úr spjaldinu', p));
    const hringjaFlag = /hring|b[óo]ka\s*t[íi]ma/i.test(caseText + '\n' + cardText);
    h += '<h2>📞 Hringja fyrst?</h2>' +
      (hringjaFlag ? '<div style="display:inline-block;background:#dc2626;color:#fff;font-weight:800;padding:3px 12px;border-radius:8px;margin-bottom:5px">📞 HRINGJA FYRST</div>' : '') +
      (phones.length
        ? '<table><tr><th>Númer</th><th>Hvaðan</th></tr>' + phones.map(p =>
            '<tr><td><a href="tel:' + p[1] + '" style="font-size:15px">' + p[1].slice(0, 3) + '-' + p[1].slice(3) + '</a></td><td>' + esc(p[0]) + '</td></tr>').join('') + '</table>'
        : '<div class="qv-warn">EKKERT símanúmer finnanlegt — hvorki í skrá né í texta málsins.</div>');

    // 🧯 Áætlaður tækjafjöldi — forgangsröð með uppruna.
    const myUtt = D.utt.filter(u => (u.customer_base_id != null && u.customer_base_id === j.baseId) ||
      (u.client && j.sites.some(s => fold(s.nafn) === fold(u.client))) ||
      (u.client && base && fold(u.client) === fold(base.nafn)));
    const rep = D.repFacts.filter(r => focusIds.includes(r.fyrirtaeki_id))[0];
    const inv = D.invFacts.filter(r => focusIds.includes(r.fyrirtaeki_id))[0];
    const txtT = taekiFromText(caseText);
    const txtC = taekiFromText(cardText);
    let taeki;
    if (myUtt.length) {
      const byType = {};
      myUtt.forEach(u => { const k = [u.type || '?', u.size || ''].filter(Boolean).join(' '); byType[k] = (byType[k] || 0) + 1; });
      taeki = '<div style="font-size:15px;font-weight:800">' + myUtt.length + ' tæki <span class="qv-badge">skráð í kerfi</span></div>' +
        '<div style="color:#475569;margin-top:2px">' + Object.entries(byType).sort((a, c) => c[1] - a[1]).map(e => esc(e[0]) + ': ' + e[1]).join(' · ') + '</div>';
    } else if (rep && rep.total_devices != null) {
      taeki = '<div style="font-size:15px;font-weight:800">' + rep.total_devices + ' tæki <span class="qv-badge">úr skýrslu ' + (rep.report_year || '') + '</span></div>';
    } else if (inv && inv.total_devices != null) {
      taeki = '<div style="font-size:15px;font-weight:800">' + inv.total_devices + ' tæki <span class="qv-badge">úr reikningi ' + dt(inv.invoice_date) + '</span></div>';
    } else if (txtT) {
      taeki = '<div style="font-size:15px;font-weight:800">„' + esc(txtT) + '" <span class="qv-badge">úr málinu</span></div>';
    } else if (txtC) {
      taeki = '<div style="font-size:15px;font-weight:800">„' + esc(txtC) + '" <span class="qv-badge">úr spjaldinu</span></div>';
    } else {
      taeki = '<div class="qv-warn" style="font-size:14px">ÓÞEKKT — engin vísbending um tækjafjölda.</div>';
    }
    h += '<h2>🧯 Áætlaður tækjafjöldi</h2>' + taeki;

    // 📄 Samningur
    const mySamn = D.samningar.filter(s => myFyrIds.has(s.company_id) || (s.kennitala && myKts(s.kennitala)) || (s.company_nafn && fold(s.company_nafn) === fold(nafn)));
    const samnNefndur = /samning|samn\b|skrifa[ðd]\s*undir/i.test(caseText + '\n' + cardText);
    h += '<h2>📄 Samningur</h2>' + (mySamn.length
      ? mySamn.map(s => kv([
          ['Þjónusta', esc(s.thjonusta || '')],
          ['Upphæð án vsk', s.upphaed_an_vsk != null ? kr(s.upphaed_an_vsk) + (s.tidni_man ? ' · á ' + s.tidni_man + ' mán fresti' : '') : ''],
          ['Næsti gjalddagi', dt(s.next_due)],
          ['Undirritað', dt(s.signed_at) || (s.signed_at ? esc(s.signed_at) : '')],
          ['Í umsjón', [s.umsjon_slokkvitaeki && 'slökkvitæki', s.umsjon_reykskynjarar && 'reykskynjarar', s.umsjon_annad].filter(Boolean).join(' · ')],
          ['Staða', esc(s.status || '')],
        ])).join('')
      : (samnNefndur
          ? '<div class="qv-warn">Samningur nefndur í máli/spjaldi en ekki skráður:</div><div class="qv-note">' +
            esc(((caseText + '\n' + cardText).match(/[^\n]*(?:samning|[Ss]amn\b|[Ss]krifa[ðd] undir)[^\n]*/) || [''])[0]) + '</div>'
          : dash));

    // 💬 Öll samskipti — nótur ORÐRÉTT + öll önnur mál + póst-tengiliðir.
    const prev = D.prevAll.filter(x => x.customer_base_id === j.baseId && (!b || x.id !== b.id));
    const myContacts = D.contacts.filter(c => c.kennitala && myKts(c.kennitala));
    h += '<h2>💬 Öll samskipti</h2>' +
      // Spjaldstitillinn ORÐRÉTTUR efst — handskrifuð athugasemd sem má ekki týnast.
      cardTitleBlock +
      (b && b.notes ? '<div class="qv-note">' + esc(b.notes) + '</div>' : '') +
      (b && b.summary ? '<div class="qv-note" style="border-color:#93c5fd">✨ ' + esc(b.summary) + '</div>' : '') +
      (prev.length
        ? '<table><tr><th>Dags.</th><th>Mál</th><th>Staða</th><th>Flokkur</th></tr>' +
          prev.slice(0, 10).map(x => '<tr' + (/lokad|closed|archived/i.test(x.status || '') ? ' style="opacity:.55"' : '') + '><td style="white-space:nowrap">' + dt(x.created_at) + '</td><td>' + esc(x.title || '') + '</td><td>' + V(x.status) + (/lokad/i.test(x.status || '') ? ' ✓' : '') + '</td><td>' + V(x.flokkur) + '</td></tr>').join('') +
          '</table>' + (prev.length > 10 ? '<div class="qv-empty" style="font-size:11px">+ ' + (prev.length - 10) + ' eldri mál</div>' : '')
        : '<div class="qv-empty">Engin önnur mál á þessum kúnna.</div>') +
      (myContacts.length
        ? '<table style="margin-top:5px"><tr><th>Póstsamskipti við</th><th>Hlutverk</th><th>Síðast</th></tr>' +
          myContacts.slice(0, 5).map(c => '<tr><td>' + esc(c.heiti || c.netfang) + (c.heiti ? ' &lt;' + esc(c.netfang) + '&gt;' : '') + '</td><td>' + V(c.hlutverk) + '</td><td>' + dt(c.sidast_sest) + '</td></tr>').join('') + '</table>'
        : '<div class="qv-empty" style="margin-top:4px">Engin skráð póstsamskipti — vitum ekki við hvern við tölum.</div>');

    // 🏢 Tengsl + 📊 Staða (tveir dálkar)
    let tengsl = multi
      ? '<table><tr><th>Staður</th><th>Heimilisf.</th><th>Þjón.</th><th>Mán.</th></tr>' +
        j.sites.filter(s => !f || s.id !== f.id).map(s => {
          const m = D.skMan.find(x => x.fyrirtaeki_id === s.id);
          return '<tr><td>' + esc(s.nafn) + '</td><td>' + V(s.heimilisfang) + '</td><td>' + (s.er_i_thjonustu ? 'já' : 'nei') + '</td><td>' + (m && m.inspect_month ? MAN[m.inspect_month].slice(0, 3) : '—') + '</td></tr>';
        }).join('') + '</table>'
      : '<div class="qv-empty">Einn staður á kennitölunni.</div>';
    const myDocs = D.docs.filter(d => myFyrIds.has(d.fyrirtaeki_id));
    const man = D.skMan.find(r => focusIds.includes(r.fyrirtaeki_id));
    const lastYr = (rep && rep.report_year) || (inv && inv.invoice_date ? String(inv.invoice_date).slice(0, 4) : '');
    const pd = f ? f.payday_delivery : null;
    const stada = kv([
      ['Í þjónustu', (f ? f.er_i_thjonustu === true : j.sites.some(s => s.er_i_thjonustu)) ? '<b>JÁ</b>' : 'nei'],
      ['Skjöl', myDocs.length ? myDocs.length + ' · nýjast ' + (myDocs[0].year || '') + ' ' + esc(myDocs[0].doc_type || '') : ''],
      ['Síðasta skoðun', lastYr ? lastYr + (man && man.inspect_month ? ' · ' + MAN[man.inspect_month] : '') + (man && man.heimild ? ' <span class="qv-badge">' + esc(man.heimild) + '</span>' : '') : ''],
      ['Rafræn skjöl', pd ? esc(pd) : '<span class="qv-warn">payday_delivery ekki stillt</span> — sjálfgefin sending gildir (rafrænt + póstafrit ef netfang er til)'],
    ]);
    h += '<div class="qv-grid2"><div><h2>🏢 Tengsl' + (multi ? ' (' + (j.sites.length - (f ? 1 : 0)) + ')' : '') + '</h2>' + tengsl + '</div>' +
      '<div><h2>📊 Staða í kerfinu</h2>' + stada + '</div></div>';

    // 📝 Samantekt — regluleg setning úr staðreyndunum.
    const bits = [];
    if (b) bits.push((b.title || 'Mál').replace(/\.$/, '') + ' (' + ageDays + (ageDays === 1 ? ' dags' : ' daga') + ' gamalt)');
    if (mySamn.length) bits.push('samningur skráður');
    else if (samnNefndur) bits.push('samningur nefndur í máli en EKKI skráður');
    if (!myUtt.length && !(rep && rep.total_devices) && !(inv && inv.total_devices)) {
      const tx = txtT || txtC;
      bits.push(tx ? 'tækjafjöldi aðeins úr ' + (txtT ? 'máli' : 'spjaldi') + ' („' + tx + '")' : 'engin tæki skráð og engin vísbending');
    }
    if (!phones.length) bits.push('ekkert símanúmer — þarf að finna tengilið áður en farið er');
    else if (hringjaFlag) bits.push('á að hringja fyrst (' + phones[0][1].slice(0, 3) + '-' + phones[0][1].slice(3) + ')');
    if (!addr) bits.push('engin staðsetning');
    h += '<h2>📝 Samantekt</h2><div style="font-size:13.5px;font-weight:600">' + esc(bits.join(' · ') || '—') + '.</div>';

    return '<div class="qv-sheet">' + h + '</div>';
  }

  // ── Glugginn ───────────────────────────────────────────────────────────────
  function close() {
    ['sb-qv-backdrop', 'sb-qv-panel'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  async function open(jobsSpec) {
    injectCSS();
    close();
    const bd = document.createElement('div'); bd.id = 'sb-qv-backdrop'; bd.addEventListener('click', close);
    const p = document.createElement('div'); p.id = 'sb-qv-panel'; p.className = 'sb-quickview';
    p.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b">Sæki allt sem kerfið veit…</div>';
    document.body.appendChild(bd); document.body.appendChild(p);
    document.addEventListener('keydown', onKey);

    const warns = [];
    let D;
    try { D = await fetchAll(jobsSpec, warns); }
    catch (e) { p.innerHTML = '<div style="padding:30px" class="qv-warn">Villa: ' + esc(e.message || e) + '</div>'; return; }

    const bar = '<div class="noprint" style="position:sticky;top:0;z-index:2;display:flex;gap:8px;align-items:center;' +
      'background:linear-gradient(180deg,#2e3037,#17181c);color:#e2e8f0;padding:9px 14px;border-radius:14px 14px 0 0">' +
      '<b style="letter-spacing:.6px;font-size:12px">👁 SNÖGGSKOÐUN</b>' +
      (warns.length ? '<span class="qv-warn" style="font-size:11px">⚠ náði ekki í: ' + warns.map(esc).join(', ') + '</span>' : '') +
      '<button id="sb-qv-print" style="margin-left:auto;border:1px solid #3a3d45;background:#23252c;color:#e2e8f0;' +
        'border-radius:8px;padding:5px 13px;font:inherit;font-size:12px;font-weight:700;cursor:pointer">🖨 Prenta</button>' +
      '<button id="sb-qv-close" style="border:1px solid #3a3d45;background:#23252c;color:#e2e8f0;border-radius:8px;' +
        'padding:5px 11px;font:inherit;font-size:12px;font-weight:700;cursor:pointer">✕</button></div>';
    p.innerHTML = bar + D.jobs.map(j => sheet(j, D)).join('');
    const pb = document.getElementById('sb-qv-print'); if (pb) pb.addEventListener('click', () => window.print());
    const cb = document.getElementById('sb-qv-close'); if (cb) cb.addEventListener('click', close);
  }

  window.Snoggskodun = { open, close };
  console.log('[snoggskodun] installed');
})();
