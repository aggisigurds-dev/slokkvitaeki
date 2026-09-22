/* === TILBÚIN — AFHENDINGARMIÐAR (389) =======================================
 *
 * 22.09.2026 (Agnar, um hönnunina á
 * https://claude.ai/artifact/T6zmQnXfazDahknjmqUeMJ: „This is awesome. Can you
 * integrate that into our site"): Tilbúin-dálkurinn í Afgreiðslu teiknaður
 * sem afhendingarmiðar.
 *
 *   • R-númer á rifflipa (núllin dofin) og biðdagar sem litaður stimpill.
 *   • Tegundarliturinn (SlokkTypeColor) sem rönd á vinstri kanti miðans (regla
 *     Agnars 17.08) og lítil slökkvitækjatákn + varan sjálf („CO₂ 100 gr ×20").
 *     Gamla kortið sagði „1 slökkvitæki" fyrir 20 stk því magnið situr í
 *     service-textanum, ekki í fjölda verklidur-lína.
 *   • Fjögur stjórntæki → tvö: „Sótt" + „⋯" (Opna verkið · Setja á hillu ·
 *     Aftur á verkstæði · Eyða verki). Hillan sést aðeins sem plata þegar hún
 *     er sett — 22.09 var ekkert af 16 tilbúnum verkum með hillu.
 *   • Listinn flokkaður eftir biðtíma (Í dag · 1–7 · 8–14 · 15+ dagar) og sama
 *     skipting sem stika í dökka hausnum. Biðtíminn er talinn frá móttöku
 *     (dropoff, annars created_at) — sama dagsetning og kortin sýndu áður.
 *   • Dagsetning birt DD/MM/YYYY (regla Agnars 17.09.2026).
 *
 * Sama dag: „perhaps make the other two windows in the same theme" — Móttekin og
 * Í vinnslu teiknast líka sem miðar (sjá KINDS). Þeir halda stafrófsröð 78 og
 * fá engan stöðutakka; ⋯ býður Opna verkið · Setja á hillu · Eyða verki.
 *
 * TENGING: 78 kallar TilbuinMidar.column() fyrir hvern dálk þegar þessi skrá er
 * hlaðin, annars teiknar 78 gömlu kortin. Að taka <script>-taggið út skilar
 * gamla útlitinu óbreyttu — engin gögn breytast við þetta patch.
 *
 * GÖMLU KRÓKARNIR SNIÐGENGNIR VILJANDI: 119 (↩ Verkstæði) leitar að
 * button[onclick*="Counter.markCollected"], 140 (hillu-fellilisti) að [onclick]
 * með „Counter.select(N)", og 78/314/324/337/382 stíla .cw-rcard og
 * [onclick^="Counter.select"]. Miðarnir nota því eigin klasa (.tbm-*) og kalla
 * í gegnum TilbuinMidar.* — annars myndu þeir þrykkja takka og fellilista inn
 * í miðann og brjóta útlitið.
 *
 * HILLA: sama vistun og 140 — AppSettings.save({ job_shelves: { [id]: 'G5' } }),
 * null = engin hilla (deepMerge fjarlægir aldrei lykil, sjá 140). save() skilar
 * false og setur í biðröð + lætur vita ef vistun mistekst (85, saveVordud).
 * ========================================================================== */
(() => {
  if (window.TilbuinMidar) return;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const pad2 = n => String(n).padStart(2, '0');

  // ── Dagsetningar og biðtími ────────────────────────────────────────────────
  function dayKey(v) {                       // → 'YYYY-MM-DD' (staðartími)
    if (!v) return '';
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (isNaN(d)) return s.slice(0, 10);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function fmtDay(key) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  }
  function ageDays(key) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key || '');
    if (!m) return 0;
    const t = new Date();
    const diff = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return Math.max(0, Math.round(diff / 86400000));
  }
  function ageLabel(d) {
    if (!d) return 'í dag';
    return d + (d % 10 === 1 && d % 100 !== 11 ? ' dagur' : ' dagar');
  }
  const BUCKETS = [
    { k: 'dag',   label: 'Í dag',      max: 0,        aria: 'í dag' },
    { k: 'vika',  label: '1–7 dagar',  max: 7,        aria: '1–7 daga' },
    { k: 'tvaer', label: '8–14 dagar', max: 14,       aria: '8–14 daga' },
    { k: 'lengi', label: '15+ dagar',  max: Infinity, aria: '15 daga eða eldri' },
  ];
  const bucketOf = d => BUCKETS.find(b => d <= b.max) || BUCKETS[3];

  // ── Tæki: litur, heiti, magn ───────────────────────────────────────────────
  function unitInfo(u) {
    const nafn = [u && u.type, u && u.size, u && u.service].filter(Boolean).join(' ');
    let c = null;
    try { c = typeof window.SlokkTypeColor === 'function' ? window.SlokkTypeColor({ nafn }) : null; } catch (_) {}
    const type = String((u && u.type) || '').trim()
      .replace(/^l[ée]ttvatnst[æa]kis?$/i, 'Léttvatn')
      .replace(/^abc\s+duft$/i, 'Duft ABC');
    const size = String((u && u.size) || '').trim();
    let label = [type, size].filter(Boolean).join(' ');
    if (!label || label === '—') label = String((u && u.service) || '').replace(/\s*×.*$/, '').trim() || 'Tæki';
    const svc = String((u && u.service) || '');
    const qm = /×\s*(\d+)/.exec(svc);
    const sm = /(hleðsla|yfirferð|skoðun|viðgerð|áfylling)/i.exec(svc);
    return { c, label, qty: qm ? Math.max(1, +qm[1]) : 1, service: sm ? sm[1].toLowerCase() : '' };
  }
  function unitsOf(jobs, live) {
    const out = [];
    jobs.forEach(j => live(j && j.units).forEach(u => out.push(unitInfo(u))));
    return out;
  }

  // ── Tákn (stroke-SVG, engin emoji) ─────────────────────────────────────────
  const S = (w, body, extra) => '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (extra || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  const ICON = {
    ext: c => '<svg class="tbm-ext" width="11" height="17" viewBox="0 0 11 17" aria-hidden="true">' +
      '<rect x="1.5" y="5" width="7" height="11.5" rx="2.6" fill="' + esc(c) + '"/>' +
      '<rect x="1.5" y="8.6" width="7" height="2.3" fill="#fff" fill-opacity=".55"/>' +
      '<rect x="3.6" y="2.6" width="2.8" height="2.8" rx=".6" fill="#2b2f37"/>' +
      '<path d="M3.2 2.3 8.3 1.1" stroke="#2b2f37" stroke-width="1.3" stroke-linecap="round" fill="none"/>' +
      '<path d="M6.3 3.7C9.5 3.7 10.1 6.2 9.7 9.2" stroke="#2b2f37" stroke-width="1.1" stroke-linecap="round" fill="none"/></svg>',
    item: '<svg class="tbm-ext" width="11" height="17" viewBox="0 0 11 17" aria-hidden="true"><rect x="1.5" y="6" width="8" height="9" rx="2" fill="none" stroke="#8a93a3" stroke-width="1.4"/></svg>',
    phone: S(11, '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>', 2.4),
    check: S(16, '<path d="M5 12.5l4.5 4.5L19 7.5"/>', 3),
    dots: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    down: S(18, '<path d="M6 9l6 6 6-6"/>', 2.5),
    up: S(18, '<path d="M18 15l-6-6-6 6"/>', 2.5),
    print: S(16, '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'),
    open: S(16, '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>'),
    shelf: S(16, '<path d="M4 3v18M20 3v18M4 9.5h16M4 16h16"/><path d="M8 9.5V6.5h3v3M13 16v-3.5h3V16"/>'),
    undo: S(16, '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>'),
    trash: S(16, '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>'),
    back: S(16, '<path d="M15 18l-6-6 6-6"/>', 2.5),
  };

  // ── Smáhlutar ──────────────────────────────────────────────────────────────
  const fmtPhone = d => (d && d.length === 7 ? d.slice(0, 3) + ' ' + d.slice(3) : (d || ''));
  function numParts(n) {
    const s = String(n == null ? '' : n).replace(/-V\d+$/i, '');
    const m = /^([A-Za-z]+-0*)(\d+)$/.exec(s);
    return m ? { n0: m[1], n1: m[2] } : { n0: '', n1: s };
  }
  function shelfMap() {
    try { return (window.AppSettings && AppSettings.path && AppSettings.path('job_shelves')) || {}; }
    catch (_) { return {}; }
  }
  const shelfOf = (map, id) => (map && map[String(id)]) || '';
  const plate = sh => sh ? '<span class="tbm-plate" title="Hilla í geymslu"><span>HILLA</span>' + esc(sh) + '</span>' : '';

  function iconsHtml(infos) {
    const MAX = 6;
    return '<span class="tbm-icons">' +
      infos.slice(0, MAX).map(i => (i.c ? ICON.ext(i.c) : ICON.item)).join('') +
      (infos.length > MAX ? '<em>+' + (infos.length - MAX) + '</em>' : '') +
    '</span>';
  }
  function itemHtml(infos) {
    if (infos.length === 1) {
      const i = infos[0];
      return '<span class="tbm-item">' + esc(i.label) + '</span>' + (i.qty > 1 ? '<span class="tbm-qty">×' + i.qty + '</span>' : '');
    }
    return '<span class="tbm-item">' + (infos.length ? infos.length + ' tæki' : 'Engin tæki') + '</span>';
  }
  // Síminn situr hægra megin í nafnalínunni (þar er pláss og þaðan er hringt);
  // varan og móttökudagurinn í línunni fyrir neðan.
  const phoneHtml = phone => phone ? '<span class="tbm-phone" title="Sími">' + ICON.phone + esc(phone) + '</span>' : '';
  function metaHtml(infos, dateStr) {
    return '<div class="tbm-meta">' + iconsHtml(infos) + itemHtml(infos) +
      (dateStr ? '<span class="tbm-sep" aria-hidden="true">·</span><span class="tbm-date" title="Móttekið">' + dateStr + '</span>' : '') +
    '</div>';
  }
  function stubHtml(np, days, b, click) {
    return '<div class="tbm-stub"' + click + '>' +
      '<div class="tbm-num">' + (np.n0 ? '<span class="tbm-num0">' + esc(np.n0) + '</span>' : '') + esc(np.n1) + '</div>' +
      '<div class="tbm-age tbm-age--' + b.k + '"><i aria-hidden="true"></i>' + ageLabel(days) + '</div>' +
    '</div>';
  }
  function sottBtn(id, small, title) {
    return '<button type="button" class="tbm-sott' + (small ? ' tbm-sott--sm' : '') + '" title="' + esc(title || 'Afhenda — opnar afgreiðsluna') + '"' +
      ' onclick="event.stopPropagation();TilbuinMidar.sott(' + id + ')">Sótt' + ICON.check + '</button>';
  }
  function moreBtn(id, small) {
    return '<button type="button" class="tbm-icon-btn tbm-more' + (small ? ' tbm-icon-btn--sm' : '') + '" data-tbm-more="' + id + '"' +
      ' aria-label="Fleiri aðgerðir" aria-haspopup="menu" aria-expanded="false"' +
      ' onclick="event.stopPropagation();TilbuinMidar.menu(event,' + id + ')">' + ICON.dots + '</button>';
  }

  // Tegundar-litakanturinn (ósk Agnars 17.08: „add the type color indicator part
  // border on everything in Afgreiðsla", aftur 22.09: „add the color line as
  // well") — 4 px rönd vinstra megin á rifflipanum. Blandað verk fær röndina í
  // bútum, einn bút á hvern lit (sömu litir og táknin, SlokkTypeColor).
  function typeStripe(infos) {
    const cols = [];
    infos.forEach(i => { if (i.c && cols.indexOf(i.c) === -1) cols.push(i.c); });
    if (!cols.length) return '';
    const step = 100 / cols.length;
    const stops = cols.map((c, k) => esc(c) + ' ' + (k * step).toFixed(2) + '% ' + ((k + 1) * step).toFixed(2) + '%').join(',');
    return ' style="--tbm-type:linear-gradient(to bottom,' + stops + ')"';
  }

  // ── Stakur miði ────────────────────────────────────────────────────────────
  function ticket(card, ctx) {
    const j = card.jobs[0];
    const id = +j.id;
    const b = bucketOf(card.days);
    const infos = unitsOf([j], ctx.live);
    const open = ' onclick="TilbuinMidar.open(' + id + ')"';
    return '<div class="tbm-wrap" data-tbm-id="' + id + '">' +
      '<div class="tbm-ticket' + (ctx.K.sott ? '' : ' tbm-ticket--nosott') + '"' + typeStripe(infos) + '>' +
        stubHtml(numParts(j.num), card.days, b, open) +
        '<div class="tbm-body" role="button" tabindex="0" title="Opna verkið" onkeydown="_cwKbAct(event)"' + open + '>' +
          '<div class="tbm-name-row"><span class="tbm-name">' + esc(j.customer || '—') + '</span>' + plate(shelfOf(ctx.shelves, id)) + phoneHtml(fmtPhone(ctx.digitsOnly(j.phone))) + '</div>' +
          metaHtml(infos, fmtDay(card.dkey)) +
        '</div>' +
        '<div class="tbm-acts">' + (ctx.K.sott ? sottBtn(id) : '') + moreBtn(id) + '</div>' +
      '</div>' +
    '</div>';
  }

  // ── Hópmiði (sami viðskiptavinur, fleiri verk) ─────────────────────────────
  // Einn „Sótt" opnar afgreiðslu fyrir alla söluna (121 safnar öllum -V
  // verkunum). Nái hópurinn yfir FLEIRI sölur fær hver lína sinn eigin „Sótt"
  // þegar hópurinn er opnaður — annars næði hópsmellurinn aðeins þeirri nýjustu.
  function groupTicket(card, ctx, idx) {
    const jobs = card.jobs;
    const first = jobs[0];
    const b = bucketOf(card.days);
    const sales = new Set(jobs.map(j => ctx.baseNum(j.num)));
    const multi = sales.size > 1;
    const expanded = !!(ctx.expanded && ctx.expanded[card.toggleKey]);
    const phoneJob = jobs.find(j => ctx.digitsOnly(j.phone));
    const phone = phoneJob ? fmtPhone(ctx.digitsOnly(phoneJob.phone)) : '';
    const shelf = jobs.map(j => shelfOf(ctx.shelves, j.id)).find(Boolean) || '';
    const np = multi ? { n0: '', n1: sales.size + ' sölur' } : numParts(first.num);
    const togJs = 'TilbuinMidar.toggle(\'' + ctx.kind + '\',' + idx + ')';
    const tog = ' onclick="' + togJs + '"';
    let rows = '';
    if (expanded) {
      // Línurnar í númeraröð (–V1, –V2 …); „Sótt" hópsins notar samt nýjasta verkið.
      const inOrder = jobs.slice().sort((a, b) => String(a.num || '').localeCompare(String(b.num || ''), 'is', { numeric: true }));
      rows = '<div class="tbm-rows">' + inOrder.map(j => {
        const rid = +j.id;
        const ri = unitsOf([j], ctx.live);
        const vm = /-V(\d+)$/i.exec(String(j.num || ''));
        const rn = (!multi && vm) ? null : numParts(j.num);
        const rowNum = rn ? (rn.n0 ? '<span class="tbm-num0">' + esc(rn.n0) + '</span>' : '') + esc(rn.n1) : '–V' + vm[1];
        const desc = ri.length === 1
          ? '<b>' + esc(ri[0].label) + '</b>' + (ri[0].qty > 1 ? '<span class="tbm-qty">×' + ri[0].qty + '</span>' : '') + (ri[0].service ? '<span>' + esc(ri[0].service) + '</span>' : '')
          : '<b>' + (ri.length ? ri.length + ' tæki' : 'Engin tæki') + '</b>';
        const ropen = ' onclick="TilbuinMidar.open(' + rid + ')"';
        return '<div class="tbm-row" data-tbm-id="' + rid + '"' + (typeStripe(ri) || ' style="--tbm-type:none"') + '>' +
          '<div class="tbm-row-stub"' + ropen + '>' + rowNum + '</div>' +
          '<div class="tbm-row-body" role="button" tabindex="0" title="Opna verkið" onkeydown="_cwKbAct(event)"' + ropen + '>' +
            iconsHtml(ri) + desc + plate(shelfOf(ctx.shelves, rid)) +
          '</div>' +
          '<div class="tbm-row-acts">' + (ctx.K.sott && multi ? sottBtn(rid, true) : '') + moreBtn(rid, true) + '</div>' +
        '</div>';
      }).join('') + '</div>';
    }
    const sottTitle = multi
      ? 'Afhenda nýjustu söluna — hinar eru í listanum þegar hópurinn er opnaður'
      : 'Afhenda öll ' + jobs.length + ' verkin — opnar afgreiðsluna';
    const allInfos = unitsOf(jobs, ctx.live);
    return '<div class="tbm-wrap tbm-wrap--group' + (expanded ? ' is-open' : '') + '">' +
      '<div class="tbm-ticket' + (ctx.K.sott ? '' : ' tbm-ticket--nosott') + '"' + typeStripe(allInfos) + '>' +
        stubHtml(np, card.days, b, tog) +
        '<div class="tbm-body" role="button" tabindex="0" aria-expanded="' + expanded + '" title="' + (expanded ? 'Fela verkin' : 'Sýna verkin') + '" onkeydown="_cwKbAct(event)"' + tog + '>' +
          '<div class="tbm-name-row"><span class="tbm-name">' + esc(first.customer || '—') + '</span><span class="tbm-chip">' + jobs.length + ' verk</span>' + plate(shelf) + phoneHtml(phone) + '</div>' +
          metaHtml(allInfos, fmtDay(card.dkey)) +
        '</div>' +
        '<div class="tbm-acts">' +
          (ctx.K.sott ? sottBtn(+first.id, false, sottTitle) : '') +
          '<button type="button" class="tbm-icon-btn' + (expanded ? ' is-on' : '') + '" aria-expanded="' + expanded + '"' +
            ' aria-label="' + (expanded ? 'Fela verkin' : 'Sýna öll verkin') + '"' +
            ' onclick="event.stopPropagation();' + togJs + '">' + (expanded ? ICON.up : ICON.down) + '</button>' +
        '</div>' +
        rows +
      '</div>' +
    '</div>';
  }

  // ── Dálkarnir þrír ─────────────────────────────────────────────────────────
  // Móttekin og Í vinnslu fengu sama útlit 22.09 („perhaps make the other two
  // windows in the same theme"). Þeir halda STAFRÓFSRÖÐ 78 (ósk Agnars 18.08) og
  // fá því enga biðtímakafla — aðeins stimpilinn á miðanum og stikuna í hausnum.
  // Enginn stöðutakki bætist við þar: stöðubreytingar eiga heima á Verkstæði.
  const KINDS = {
    received:   { title: 'Móttekin',  cls: 'mot',  ink: '#64748b', label: n => n === 1 ? 'verk bíður verkstæðis' : 'verk bíða verkstæðis', sections: false, sott: false, print: false },
    inprogress: { title: 'Í vinnslu', cls: 'vin',  ink: '#d97706', label: () => 'verk á verkstæðinu', sections: false, sott: false, print: false },
    ready:      { title: 'Tilbúin',   cls: 'tilb', ink: '#059669', label: n => n === 1 ? 'verk bíður afhendingar' : 'verk bíða afhendingar', sections: true, sott: true, print: true },
  };

  // ── Hausinn ────────────────────────────────────────────────────────────────
  function headHtml(K, n, total, counts, searching) {
    const segs = BUCKETS.filter(b => counts[b.k] > 0)
      .map(b => '<span class="tbm-c-' + b.k + '" style="flex-grow:' + counts[b.k] + '"></span>').join('');
    const aria = 'Biðtími: ' + BUCKETS.map(b => counts[b.k] + ' verk ' + b.aria).join(', ');
    const legend = BUCKETS.map(b =>
      '<span' + (counts[b.k] ? '' : ' class="is-zero"') + '><i class="tbm-c-' + b.k + '" aria-hidden="true"></i>' + b.label + ' <b>' + counts[b.k] + '</b></span>').join('');
    const label = searching ? 'af ' + total + ' verkum' : K.label(n);
    return '<div class="cw-col-head tbm-head tbm-head--' + K.cls + '">' +
      '<i class="tbm-rivet tl" aria-hidden="true"></i><i class="tbm-rivet tr" aria-hidden="true"></i>' +
      '<i class="tbm-rivet bl" aria-hidden="true"></i><i class="tbm-rivet br" aria-hidden="true"></i>' +
      '<div class="tbm-head-main">' +
        '<div class="tbm-head-left">' +
          '<div class="cw-col-title tbm-title" style="color:' + K.ink + '"><span class="tbm-led" aria-hidden="true"></span>' + K.title + '</div>' +
          '<div class="cw-col-sub tbm-count"><b>' + n + '</b><span>' + label + '</span></div>' +
        '</div>' +
        (K.print ? '<button type="button" class="tbm-print" onclick="window.Counter&&Counter.printReady&&Counter.printReady()" title="Prenta lista yfir tilbúin verk (með símanúmerum)">' + ICON.print + '<span>Prenta</span></button>' : '') +
      '</div>' +
      '<div class="cw-col-sub tbm-age">' +
        (n ? '<div class="tbm-bar" role="img" aria-label="' + esc(aria) + '">' + segs + '</div><div class="tbm-legend">' + legend + '</div>'
           : '<div class="tbm-bar tbm-bar--tom" aria-hidden="true"><span></span></div><div class="tbm-legend"><span class="is-zero">Ekkert verk</span></div>') +
      '</div>' +
    '</div>';
  }

  // ── Dálkur — kallað úr 78 (counterRender), einu sinni fyrir hvern dálk ─────
  // ctx: { kind, live, digitsOnly, custKey, baseNum, expanded, total, searching }
  const _keys = { received: [], inprogress: [], ready: [] };
  function column(jobs, ctx) {
    const kind = KINDS[ctx && ctx.kind] ? ctx.kind : 'ready';
    const K = KINDS[kind];
    ctx = Object.assign({}, ctx, { kind, K, shelves: shelfMap() });
    // Hópað eftir sama auðkenni og 78 (custKey: nafn + sími) — sama viðskiptavinur = einn miði.
    const byKey = new Map();
    (jobs || []).forEach(j => {
      const k = ctx.custKey(j);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(j);
    });
    const cards = [];
    byKey.forEach((list, k) => {
      // Elsta móttökudagsetning hópsins ræður biðtímanum (sá sem hefur beðið lengst).
      const keys = list.map(j => dayKey(j.dropoff || j.created_at)).filter(Boolean).sort();
      const dkey = keys[0] || '';
      // Sama lykill og 78 notar í Counter.expandedCos (statusKey + ':' + custKey).
      cards.push({ k, jobs: list, dkey, days: ageDays(dkey), name: String(list[0].customer || ''), toggleKey: kind + ':' + k });
    });
    // Tilbúin: nýjast efst (ósk Agnars 18.08), jafntefli brotið á nafni eins og 78.
    // Móttekin / Í vinnslu: röðin sem 78 skilar (stafrófsröð) helst óbreytt.
    if (K.sections) cards.sort((a, b) => b.dkey.localeCompare(a.dkey) || a.name.localeCompare(b.name, 'is', { sensitivity: 'base' }));

    _keys[kind] = [];
    const one = c => (c.jobs.length === 1 ? ticket(c, ctx) : groupTicket(c, ctx, _keys[kind].push(c.toggleKey) - 1));
    const counts = { dag: 0, vika: 0, tvaer: 0, lengi: 0 };
    const secs = BUCKETS.map(b => ({ b, cards: [], n: 0 }));
    cards.forEach(c => {
      const s = secs[BUCKETS.indexOf(bucketOf(c.days))];
      s.cards.push(c); s.n += c.jobs.length; counts[s.b.k] += c.jobs.length;
    });
    let body = cards.length ? '' : '<div class="tbm-empty">Engin verk</div>';
    if (K.sections) {
      secs.forEach(s => {
        if (!s.cards.length) return;
        body += '<div class="tbm-sec tbm-sec--' + s.b.k + '"><span class="tbm-sec-lbl">' + s.b.label + '</span>' +
          '<span class="tbm-sec-n">' + s.n + '</span><span class="tbm-sec-rule" aria-hidden="true"></span></div>';
        s.cards.forEach(c => { body += one(c); });
      });
    } else {
      cards.forEach(c => { body += one(c); });
    }
    const n = (jobs || []).length;
    return '<div class="cw-col tbm-col tbm-col--' + K.cls + '" style="display:flex;flex-direction:column;background:#fff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;min-height:0;min-width:0">' +
      headHtml(K, n, ctx.total == null ? n : ctx.total, counts, !!ctx.searching) +
      '<div class="cw-col-scroll tbm-scroll" style="overflow-y:auto;padding:6px;flex:1;min-height:0">' + body + '</div>' +
    '</div>';
  }

  // ── ⋯ valmyndin (fljótandi, í <body> svo skrunhólfið klippi hana ekki) ─────
  let pop = null, popId = null, popTrigger = null;
  function jobLabel(id) {
    const j = window.DB && DB.getJob ? DB.getJob(id) : null;
    return j ? String(j.num || '').replace(/-V\d+$/i, '') : ('#' + id);
  }
  function menuHtml(id) {
    const sh = shelfOf(shelfMap(), id);
    const j = window.DB && DB.getJob ? DB.getJob(id) : null;
    const isReady = !!(j && j.status === 'ready');     // „Aftur á verkstæði" á aðeins við tilbúin verk
    return '<button type="button" role="menuitem" class="tbm-mi" data-act="opna">' + ICON.open + 'Opna verkið</button>' +
      '<button type="button" role="menuitem" class="tbm-mi" data-act="hilla">' + ICON.shelf + 'Setja á hillu<span class="tbm-mi-hint">' + (sh ? esc(sh) : 'G1–G40') + '</span></button>' +
      (isReady ? '<button type="button" role="menuitem" class="tbm-mi" data-act="verkstaedi">' + ICON.undo + 'Aftur á verkstæði</button>' : '') +
      '<div class="tbm-div" role="separator"></div>' +
      '<button type="button" role="menuitem" class="tbm-mi tbm-mi--danger" data-act="eyda">' + ICON.trash + 'Eyða verki</button>';
  }
  function shelfHtml(id) {
    const cur = shelfOf(shelfMap(), id);
    const list = Array.from({ length: 40 }, (_, i) => 'G' + (i + 1));    // G1–G40, eins og 140
    return '<div class="tbm-pop-h"><button type="button" class="tbm-back" data-act="aftur" aria-label="Til baka">' + ICON.back + '</button>' +
        'Hilla <span>' + esc(jobLabel(id)) + '</span></div>' +
      '<div class="tbm-shelves">' + list.map(s =>
        '<button type="button" role="menuitemradio" aria-checked="' + (s === cur) + '" data-shelf="' + s + '"' + (s === cur ? ' class="is-on"' : '') + '>' + s + '</button>').join('') +
      '</div>' +
      (cur ? '<button type="button" role="menuitem" class="tbm-mi tbm-shelf-clear" data-shelf="">Engin hilla</button>' : '');
  }
  function focusFirst() {
    if (!pop) return;
    const b = pop.querySelector('.is-on') || pop.querySelector('button:not(.tbm-back)') || pop.querySelector('button');
    if (b) { try { b.focus({ preventScroll: true }); } catch (_) { b.focus(); } }
  }
  function place() {
    if (!pop || !popTrigger || !popTrigger.isConnected) return;
    const r = popTrigger.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    const left = Math.min(vw - pw - 8, Math.max(8, r.right - pw));
    let top = r.bottom + 6;
    if (top + ph > vh - 8) top = Math.max(8, r.top - ph - 6);
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(top) + 'px';
  }
  function onDocDown(e) {
    if (pop && !pop.contains(e.target) && !(popTrigger && popTrigger.contains(e.target))) closePop(false);
  }
  function onKey(e) {
    if (!pop) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(true); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const items = Array.from(pop.querySelectorAll('button'));
      if (!items.length) return;
      let i = items.indexOf(document.activeElement);
      const fwd = e.key === 'ArrowDown' || e.key === 'ArrowRight';
      i = fwd ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1);
      items[i].focus();
      e.preventDefault();
    }
  }
  function onScroll(e) { if (pop && !(e.target && e.target.nodeType === 1 && pop.contains(e.target))) closePop(false); }
  function onResize() { closePop(false); }
  function closePop(focusBack) {
    if (!pop) return;
    pop.remove();
    pop = null;
    document.removeEventListener('pointerdown', onDocDown, true);
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', onResize);
    const t = popTrigger;
    popTrigger = null; popId = null;
    if (t) {
      t.setAttribute('aria-expanded', 'false');
      if (focusBack && t.isConnected) { try { t.focus({ preventScroll: true }); } catch (_) {} }
    }
  }
  async function setShelf(id, v) {
    if (!window.AppSettings || typeof AppSettings.save !== 'function') { alert('Stillingar eru ekki hlaðnar — reyndu aftur eftir augnablik.'); return; }
    const patch = {}; patch[String(id)] = v || null;      // null = engin hilla (sjá 140)
    let ok = false;
    try { ok = await AppSettings.save({ job_shelves: patch }); } catch (e) { console.warn('[389] hilla:', e); }
    if (ok && window.Toast && typeof Toast.show === 'function') {
      try { Toast.show(v ? ('Hilla ' + v + ' · ' + jobLabel(id)) : ('Hilla tekin af · ' + jobLabel(id))); } catch (_) {}
    }
    // ok === false: 85 (saveVordud) hefur þegar sagt frá og sett í biðröð.
    try { if (window.Counter && Counter.render) Counter.render(); } catch (_) {}
    try { if (window.Workshop && Workshop.render) Workshop.render(); } catch (_) {}
  }
  function onPopClick(e) {
    const b = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!b || !pop) return;
    e.stopPropagation();
    const id = popId;
    if (b.hasAttribute('data-shelf')) { const v = b.getAttribute('data-shelf'); closePop(true); setShelf(id, v); return; }
    const act = b.getAttribute('data-act');
    if (act === 'hilla' || act === 'aftur') {
      pop.innerHTML = act === 'hilla' ? shelfHtml(id) : menuHtml(id);
      pop.classList.toggle('is-shelf', act === 'hilla');
      place(); focusFirst();
      return;
    }
    closePop(false);
    if (act === 'opna') TM.open(id);
    else if (act === 'verkstaedi') { if (window.Counter && Counter.sendBackToWorkshop) Counter.sendBackToWorkshop(id); }
    else if (act === 'eyda') { if (window.Workshop && Workshop.deleteVerkGroup) Workshop.deleteVerkGroup([id]); }
  }

  // ── Opinbert viðmót ────────────────────────────────────────────────────────
  const TM = window.TilbuinMidar = {
    column,
    open(id) { closePop(false); if (window.Counter && Counter.select) Counter.select(id); },
    sott(id) { closePop(false); if (window.Counter && Counter.markCollected) Counter.markCollected(id); },
    toggle(kind, i) {
      closePop(false);
      const k = (_keys[kind] || [])[i];
      if (k != null && window.Counter && Counter.toggleCo) Counter.toggleCo(k);
    },
    menu(ev, id) {
      const btn = (ev && ev.currentTarget) || null;
      if (pop && popId === id) { closePop(true); return; }
      closePop(false);
      pop = document.createElement('div');
      pop.className = 'tbm-pop';
      pop.setAttribute('role', 'menu');
      pop.setAttribute('aria-label', 'Aðgerðir fyrir ' + jobLabel(id));
      pop.innerHTML = menuHtml(id);
      pop.addEventListener('click', onPopClick);
      document.body.appendChild(pop);
      popId = id; popTrigger = btn;
      if (btn) btn.setAttribute('aria-expanded', 'true');
      place();
      document.addEventListener('pointerdown', onDocDown, true);
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onResize);
      focusFirst();
    },
    // 78 endurteiknar borðið oft (rauntími, síun) — opin valmynd flyst á nýja
    // takkann eftir að 78 hefur skilað skrunstöðunni (þess vegna rAF).
    afterRender() {
      if (!pop) return;
      requestAnimationFrame(() => {
        if (!pop) return;
        const nb = document.querySelector('#view-counter [data-tbm-more="' + popId + '"]');
        if (!nb) { closePop(false); return; }
        popTrigger = nb; nb.setAttribute('aria-expanded', 'true'); place();
      });
    },
    close: () => closePop(false),
    _age: { dayKey, ageDays, ageLabel, bucketOf, fmtDay, unitInfo },
  };

  // ── Stílar ─────────────────────────────────────────────────────────────────
  // #view-counter í hverri reglu: vinnur .cw-col-head * litareglu 313 og
  // #view-counter .cw-col-head padding 78 án þess að snerta aðra dálka.
  // 324 (Stilla útlit) með tvöföldu auðkenni vinnur enn — falinn/mjór haus gildir.
  if (!document.getElementById('_tbm-css')) {
    const V = '#view-counter ';
    const MONO = '"JetBrains Mono",ui-monospace,monospace';
    const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
    const css = [
      // dálkurinn + stálplatan
      V + '.tbm-col{container-type:inline-size;container-name:tbm}',
      V + '.tbm-scroll{background-color:#e2e6ec!important;background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)!important;padding:8px 10px 16px!important}',
      V + '.tbm-empty{padding:22px;color:#525b6b;font-size:12px;text-align:center}',
      // hausinn
      V + '.cw-col-head.tbm-head{position:relative;display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-start!important;gap:12px!important;padding:16px 18px 14px!important;background:' + METAL + '!important;border-bottom:1px solid #000!important}',
      V + '.tbm-rivet{position:absolute;width:7px;height:7px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)}',
      V + '.tbm-rivet.tl{top:6px;left:6px}' + V + '.tbm-rivet.tr{top:6px;right:6px}' + V + '.tbm-rivet.bl{bottom:6px;left:6px}' + V + '.tbm-rivet.br{bottom:6px;right:6px}',
      V + '.tbm-head-main{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;min-width:0}',
      V + '.tbm-head-left{display:flex;flex-direction:column;gap:6px;min-width:0}',
      V + '.tbm-head .cw-col-title.tbm-title{display:flex;align-items:center;gap:9px;font-family:' + MONO + '!important;font-size:11.5px!important;font-weight:700!important;letter-spacing:.2em!important;text-transform:uppercase;color:#3cc47c!important}',
      V + '.tbm-led{flex:none;width:8px;height:8px;border-radius:50%;background:#3cc47c;box-shadow:0 0 0 3px rgba(60,196,124,.16),0 0 12px rgba(60,196,124,.8)}',
      // Móttekin rauður, Í vinnslu gulbrúnn — sömu litir og Agnar setti á dálkaheitin í Stílstjóra
      V + '.tbm-head--mot .cw-col-title.tbm-title{color:#f0584c!important}',
      V + '.tbm-head--mot .tbm-led{background:#f0584c;box-shadow:0 0 0 3px rgba(240,88,76,.18),0 0 12px rgba(240,88,76,.85)}',
      V + '.tbm-head--vin .cw-col-title.tbm-title{color:#f6b545!important}',
      V + '.tbm-head--vin .tbm-led{background:#f6b545;box-shadow:0 0 0 3px rgba(246,181,69,.18),0 0 12px rgba(246,181,69,.85)}',
      V + '.tbm-head .cw-col-sub.tbm-count{display:flex;align-items:baseline;gap:9px;margin:0!important;font-family:"IBM Plex Sans",system-ui,sans-serif!important;font-size:14px!important;color:#cfd4dc!important;min-width:0}',
      V + '.tbm-count b{font-family:Sora,"IBM Plex Sans",sans-serif;font-size:34px;font-weight:700;line-height:1;letter-spacing:-.03em;color:#fff!important}',
      V + '.tbm-count span{font-weight:500;color:#cfd4dc!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      V + '.tbm-print{flex:none;height:38px;display:inline-flex;align-items:center;gap:8px;padding:0 14px 0 12px;border-radius:9px;border:1px solid #000;background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);color:#eef1f4!important;font-size:13px;font-weight:600;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);cursor:pointer}',
      V + '.tbm-print *{color:#eef1f4!important}' + V + '.tbm-print:hover{filter:brightness(1.2)}',
      V + '.tbm-head .cw-col-sub.tbm-age{display:flex;flex-direction:column;align-items:stretch!important;gap:8px;margin:0!important;font-family:' + MONO + '!important;font-size:11px!important;color:#aeb6c4!important}',
      V + '.tbm-bar{display:flex;gap:3px;height:6px;width:100%}' + V + '.tbm-bar span{flex-basis:0;min-width:4px;border-radius:3px}',
      V + '.tbm-bar--tom span{flex-grow:1;background:rgba(255,255,255,.12)}',
      V + '.tbm-legend{display:flex;flex-wrap:wrap;justify-content:flex-start;gap:4px 16px;width:100%}',
      V + '.tbm-legend span{display:inline-flex;align-items:center;gap:6px;color:#aeb6c4!important}',
      V + '.tbm-legend span.is-zero{opacity:.55}',
      V + '.tbm-legend i{width:7px;height:7px;border-radius:2px}',
      V + '.tbm-legend b{color:#fff!important}',
      // málmáferð á litalínunum í hausnum (sama og takkarnir): ljós brún efst, dökk rönd í miðjunni
      V + '.tbm-c-dag{background:linear-gradient(180deg,#7fe0a8 0%,#23a35a 40%,#0b5a2e 60%,#137a41 100%)}' +
        V + '.tbm-c-vika{background:linear-gradient(180deg,#e2e6ec 0%,#8f98a8 40%,#555d6b 60%,#737c8b 100%)}' +
        V + '.tbm-c-tvaer{background:linear-gradient(180deg,#ffe0a0 0%,#e0a93e 40%,#935f0d 60%,#b27b1c 100%)}' +
        V + '.tbm-c-lengi{background:linear-gradient(180deg,#ff9d95 0%,#e25555 40%,#971515 60%,#b52020 100%)}',
      // kaflarnir
      V + '.tbm-sec{display:flex;align-items:center;gap:8px;padding:12px 2px 0;margin-bottom:8px}',
      V + '.tbm-sec:first-child{padding-top:2px}',
      V + '.tbm-sec-lbl{font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}',
      V + '.tbm-sec--dag .tbm-sec-lbl{color:#0b6b3a}' + V + '.tbm-sec--vika .tbm-sec-lbl{color:#3a4250}' + V + '.tbm-sec--tvaer .tbm-sec-lbl{color:#845400}' + V + '.tbm-sec--lengi .tbm-sec-lbl{color:#b42318}',
      V + '.tbm-sec-n{padding:1px 7px;border-radius:99px;background:rgba(20,24,34,.09);font-family:' + MONO + ';font-size:10.5px;font-weight:700;color:#2b313c}',
      V + '.tbm-sec-rule{flex:1 1 auto;height:1px;background:rgba(20,24,34,.16)}',
      // miðinn
      V + '.tbm-wrap{position:relative;margin-bottom:8px;filter:drop-shadow(0 1px 1px rgba(15,20,30,.22)) drop-shadow(0 6px 12px rgba(15,20,30,.12))}',
      V + '.tbm-wrap--group{padding-bottom:10px}',
      V + '.tbm-wrap--group::before,' + V + '.tbm-wrap--group::after{content:"";position:absolute;z-index:0;height:40px;border-radius:0 0 12px 12px}',
      V + '.tbm-wrap--group::before{left:16px;right:16px;bottom:0;background:#dfe3ea}',
      V + '.tbm-wrap--group::after{left:8px;right:8px;bottom:5px;background:#eff1f5}',
      V + '.tbm-wrap--group.is-open{padding-bottom:0}' + V + '.tbm-wrap--group.is-open::before,' + V + '.tbm-wrap--group.is-open::after{display:none}',
      V + '.tbm-ticket{--tbm-stub:92px;position:relative;z-index:1;display:grid;grid-template-columns:var(--tbm-stub) minmax(0,1fr) auto;grid-template-rows:minmax(72px,auto);grid-template-areas:"stub body acts";border-radius:12px;overflow:hidden;background:#fff;box-shadow:inset 0 0 0 1px rgba(20,24,34,.07);' +
        '-webkit-mask:radial-gradient(circle at var(--tbm-stub) 0,transparent 7px,#000 7.5px) top/100% 51% no-repeat,radial-gradient(circle at var(--tbm-stub) 100%,transparent 7px,#000 7.5px) bottom/100% 51% no-repeat;' +
        'mask:radial-gradient(circle at var(--tbm-stub) 0,transparent 7px,#000 7.5px) top/100% 51% no-repeat,radial-gradient(circle at var(--tbm-stub) 100%,transparent 7px,#000 7.5px) bottom/100% 51% no-repeat}',
      V + '.tbm-wrap:hover .tbm-ticket{box-shadow:inset 0 0 0 1px rgba(201,42,42,.45)}',
      V + '.tbm-stub{position:relative;grid-area:stub;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:6px;padding:12px 0 12px 12px;background:#f4f6f9;border-right:1.5px dashed #c3cad5;cursor:pointer}',
      // tegundar-röndin (typeStripe) — sama lína og gömlu kortin báru
      V + '.tbm-stub::before,' + V + '.tbm-row-stub::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--tbm-type,none)}',
      V + '.tbm-num{font-family:' + MONO + ';font-size:14px;font-weight:700;letter-spacing:-.02em;line-height:1.2;color:#11141c;white-space:nowrap;overflow:hidden}',
      V + '.tbm-num0{color:#a1a9b6}',
      V + '.tbm-age{display:flex;align-items:center;gap:5px;font-family:' + MONO + ';font-size:11px;font-weight:700;line-height:1.2;white-space:nowrap}',
      V + '.tbm-age i{flex:none;width:6px;height:6px;border-radius:50%}',
      V + '.tbm-age--dag{color:#0b6b3a}' + V + '.tbm-age--dag i{background:#16783f}',
      V + '.tbm-age--vika{color:#4a5363}' + V + '.tbm-age--vika i{background:#8a93a3}',
      V + '.tbm-age--tvaer{color:#845400}' + V + '.tbm-age--tvaer i{background:#e0a93e}',
      V + '.tbm-age--lengi{color:#b42318}' + V + '.tbm-age--lengi i{background:#c92a2a}',
      V + '.tbm-body{grid-area:body;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:5px;padding:12px 8px 12px 16px;cursor:pointer;outline:none}',
      V + '.tbm-body:focus-visible,' + V + '.tbm-row-body:focus-visible{box-shadow:inset 0 0 0 2px #c92a2a;border-radius:8px}',
      V + '.tbm-name-row{display:flex;align-items:center;gap:8px;min-width:0}',
      V + '.tbm-name{min-width:0;font-size:15px;font-weight:600;line-height:1.25;color:#11141c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      V + '.tbm-chip{flex:none;padding:2px 7px;border-radius:6px;background:#1d1f24;font-family:' + MONO + ';font-size:10.5px;font-weight:700;color:#fff}',
      V + '.tbm-plate{flex:none;display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:6px;background:' + METAL + ';font-family:' + MONO + ';font-size:11px;font-weight:700;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}',
      V + '.tbm-plate span{font-weight:500;letter-spacing:.08em;color:#aeb6c4}',
      V + '.tbm-meta{display:flex;align-items:center;gap:6px;min-width:0;font-size:12px;line-height:1.3;color:#5b6472;white-space:nowrap;overflow:hidden}',
      V + '.tbm-icons{flex:none;display:inline-flex;align-items:flex-end;gap:2px}',
      V + '.tbm-icons em{font-style:normal;font-family:' + MONO + ';font-size:10.5px;font-weight:700;color:#5b6472;margin-left:2px}',
      V + '.tbm-ext{display:block;flex:none}',
      V + '.tbm-item{font-weight:500;color:#2b313c;min-width:0;overflow:hidden;text-overflow:ellipsis}',
      V + '.tbm-qty{flex:none;padding:0 5px;border-radius:5px;background:#eceff4;font-family:' + MONO + ';font-size:11px;font-weight:700;color:#1f2530}',
      V + '.tbm-sep{flex:none;color:#a1a9b6}',
      V + '.tbm-phone{flex:none;margin-left:auto;padding-left:4px;display:inline-flex;align-items:center;gap:4px;font-family:' + MONO + ';font-size:11.5px;color:#3a4250}',
      V + '.tbm-date{flex:none;font-family:' + MONO + ';font-size:11.5px}',
      V + '.tbm-acts{grid-area:acts;display:flex;align-items:center;gap:6px;padding:0 12px 0 4px}',
      V + '.tbm-sott{flex:none;height:44px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 14px 0 16px;border-radius:10px;border:1px solid rgba(52,168,98,.55);background:linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%);color:#fff;font-size:14px;font-weight:700;letter-spacing:.01em;text-shadow:0 1px 1px rgba(0,0,0,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3);cursor:pointer;white-space:nowrap}',
      V + '.tbm-sott:hover{filter:brightness(1.22)}' + V + '.tbm-sott:active{filter:brightness(.95);box-shadow:inset 0 2px 5px rgba(0,0,0,.4)}',
      V + '.tbm-sott--sm{height:40px;padding:0 12px;font-size:13px}',
      V + '.tbm-icon-btn{flex:none;width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;padding:0;border-radius:10px;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);color:#3a4250;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);cursor:pointer}',
      V + '.tbm-icon-btn:hover{border-color:rgba(20,24,34,.32)}',
      V + '.tbm-icon-btn--sm{width:40px;height:40px;border-radius:9px}',
      V + '.tbm-icon-btn.is-on,' + V + '.tbm-icon-btn[aria-expanded="true"]{border-color:#000;background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 1px 2px rgba(0,0,0,.25)}',
      // opinn hópur
      V + '.tbm-rows{grid-column:1/-1;display:flex;flex-direction:column;border-top:1.5px dashed #c3cad5}',
      V + '.tbm-row{display:grid;grid-template-columns:var(--tbm-stub) minmax(0,1fr) auto;min-height:48px}',
      V + '.tbm-row+.tbm-row{border-top:1px solid #edf0f4}',
      V + '.tbm-row-stub{position:relative;min-width:0;display:flex;align-items:center;padding-left:12px;background:#f4f6f9;border-right:1.5px dashed #c3cad5;font-family:' + MONO + ';font-size:11.5px;font-weight:700;color:#5b6472;white-space:nowrap;overflow:hidden;cursor:pointer}',
      V + '.tbm-row-body{min-width:0;display:flex;align-items:center;gap:8px;padding:0 8px 0 16px;font-size:13px;color:#5b6472;white-space:nowrap;overflow:hidden;cursor:pointer;outline:none}',
      V + '.tbm-row-body b{font-weight:600;color:#1f2530;min-width:0;overflow:hidden;text-overflow:ellipsis}',
      V + '.tbm-row-acts{display:flex;align-items:center;gap:6px;padding:0 12px 0 4px}',
      // mjór dálkur (≈1280 px gluggi, Sími/app, 337-pönnun): takkarnir í eigin röð
      '@container tbm (max-width: 470px){' +
        V + '.tbm-ticket{--tbm-stub:78px;grid-template-columns:var(--tbm-stub) minmax(0,1fr);grid-template-rows:auto auto;grid-template-areas:"stub body" "stub acts"}' +
        V + '.tbm-stub{padding-left:10px}' +
        V + '.tbm-num{font-size:12.5px}' +
        V + '.tbm-body{padding:10px 10px 4px 14px}' +
        V + '.tbm-meta{flex-wrap:wrap;row-gap:2px}' +
        V + '.tbm-meta .tbm-sep{display:none}' +
        V + '.tbm-name-row{flex-wrap:wrap;row-gap:2px}' +
        V + '.tbm-phone{margin-left:0;padding-left:0}' +
        V + '.tbm-acts{padding:4px 10px 10px 14px}' +
        V + '.tbm-acts .tbm-sott{flex:1 1 auto;height:40px}' +
        V + '.tbm-acts .tbm-icon-btn{width:40px;height:40px}' +
        // Móttekin / Í vinnslu hafa engan Sótt-takka — ⋯ helst efst til hægri, engin auka-röð
        V + '.tbm-ticket.tbm-ticket--nosott{grid-template-columns:var(--tbm-stub) minmax(0,1fr) auto;grid-template-rows:auto;grid-template-areas:"stub body acts"}' +
        V + '.tbm-ticket--nosott .tbm-body{padding:10px 6px 10px 14px}' +
        V + '.tbm-ticket--nosott .tbm-acts{padding:0 10px 0 2px}' +
        V + '.tbm-row-stub{padding-left:10px}' +
        V + '.tbm-row-body{padding-left:14px}' +
        V + '.cw-col-head.tbm-head{padding:14px 14px 12px!important}' +
        V + '.tbm-count b{font-size:28px}' +
      '}',
      '@container tbm (max-width: 330px){' +
        V + '.tbm-print span{display:none}' +
        V + '.tbm-print{padding:0 11px}' +
        V + '.tbm-count span{font-size:12.5px}' +
      '}',
      // ⋯ valmyndin (í <body>, utan .view)
      '.tbm-pop{position:fixed;z-index:7900;width:252px;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;padding:6px;background:#fff;border:1px solid rgba(20,24,34,.12);border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);font-family:"IBM Plex Sans",system-ui,sans-serif;color:#1f2530}',
      '.tbm-pop button.tbm-mi{width:100%;height:40px;min-height:40px;display:flex;align-items:center;gap:10px;margin:0;padding:0 10px;border:0;border-radius:8px;background:transparent;color:#1f2530;font:500 13.5px/1 "IBM Plex Sans",system-ui,sans-serif;text-align:left;cursor:pointer;box-shadow:none}',
      '.tbm-pop button.tbm-mi:hover,.tbm-pop button.tbm-mi:focus-visible{background:#f1f4f8;outline:none}',
      '.tbm-pop .tbm-mi svg{flex:none;color:#5b6472}',
      '.tbm-pop button.tbm-mi--danger{color:#b42318;font-weight:600}',
      '.tbm-pop .tbm-mi--danger svg{color:#b42318}',
      '.tbm-pop .tbm-mi-hint{margin-left:auto;font-family:' + MONO + ';font-size:11px;color:#6b7483}',
      '.tbm-pop .tbm-div{height:1px;margin:4px 6px;background:#eceff3}',
      '.tbm-pop .tbm-pop-h{display:flex;align-items:center;gap:8px;padding:2px 2px 8px;font:700 10.5px/1 ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#3a4250}',
      '.tbm-pop .tbm-pop-h span{margin-left:auto;letter-spacing:0;text-transform:none;color:#6b7483;font-weight:500}',
      '.tbm-pop button.tbm-back{width:32px;height:32px;min-height:32px;display:inline-flex;align-items:center;justify-content:center;margin:0;padding:0;border:1px solid rgba(20,24,34,.14);border-radius:8px;background:#f6f8fb;color:#3a4250;cursor:pointer}',
      '.tbm-pop .tbm-shelves{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}',
      '.tbm-pop .tbm-shelves button{height:36px;min-height:36px;margin:0;padding:0;border-radius:7px;border:1px solid rgba(20,24,34,.14);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);font:700 12px/1 ' + MONO + ';color:#1f2530;cursor:pointer}',
      '.tbm-pop .tbm-shelves button:hover,.tbm-pop .tbm-shelves button:focus-visible{border-color:#c92a2a;outline:none}',
      '.tbm-pop .tbm-shelves button.is-on{background:' + METAL + ';border-color:#000;color:#fff}',
      '.tbm-pop button.tbm-shelf-clear{margin-top:6px;justify-content:center;border:1px solid rgba(20,24,34,.14)}',
      '@media (prefers-reduced-motion: no-preference){.tbm-pop{animation:tbm-pop-in .12s ease-out}@keyframes tbm-pop-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}}',
    ].join('\n');
    const st = document.createElement('style');
    st.id = '_tbm-css';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  // Borðið gæti hafa teiknast áður en þessi skrá hlóðst — teikna aftur einu sinni.
  setTimeout(() => {
    try {
      if (document.querySelector('#view-counter .cw-col') && !document.querySelector('#view-counter .tbm-col') && window.Counter && Counter.render) Counter.render();
    } catch (_) {}
  }, 0);

  console.log('[patch-389] Tilbúin — afhendingarmiðar');
})();
/* === END TILBÚIN — AFHENDINGARMIÐAR === */
