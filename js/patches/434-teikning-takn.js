/* === TEIKNING: TÁKN, STILLINGAR OG EI-ÁBENDINGAR (434) =====================
 *
 * Agnar 02.10.2026, ofan á dráttinn: velja tákn í Stillingum (léttvatn, duft,
 * CO₂, slanga, merki); stimpla Rafmagnstöflu og slökkvitækja-/slönguskilti
 * sem merki (ekki uttaeki); lesa EI-30/EI-60 sem veggja-ÁBENDINGAR á öllum
 * snúningum (0/90/180/270 og meðfram veggjum). Aldrei stimpla eldveggi.
 * ========================================================================== */
(() => {
  if (typeof window !== 'undefined' && window.TeiknTakn) return;

  const GLYFF = ['extinguisher', 'hose', 'sign-extinguisher', 'sign-hose', 'exit', 'electric', 'hydrant', 'pin', 'alarm', 'detector', 'magnet'];
  const GLYFF_NOFN = {
    extinguisher: 'Slökkvitæki', hose: 'Slanga', 'sign-extinguisher': 'Skilti SLT',
    'sign-hose': 'Skilti slanga', exit: 'Útgangur', electric: 'Rafmagn',
    hydrant: 'Hani', pin: 'Pinni', alarm: 'Hnappur', detector: 'Skynjari', magnet: 'Segull'
  };
  const SJALF = {
    lettvatn: 'extinguisher', duft: 'extinguisher', co2: 'extinguisher', slanga: 'hose',
    neydarutgangur: 'exit', ut: 'exit', hose: 'hose',
    rafmagn: 'electric', skilti_slt: 'sign-extinguisher', skilti_slanga: 'sign-hose',
    reykskynjari: 'detector', hitaskynjari: 'detector', bjalla: 'alarm', segull: 'magnet'
  };
  const LITIR = {
    // 05.10.2026 (Agnar: „fallegri útgáfu af slökkvitækjamerkingunum með sínum þemalit"): kúturinn er hvítur á rauðri
    // málmplötu og ber BORÐA í lit tegundarinnar — léttvatn sægrænt, duft blátt, CO₂ svart með trekt. Áður var allt
    // táknið litað (sægrænn kútur á rauðu), sem las illa í lítilli stærð.
    lettvatn: { bg: '#e11d2e', fg: '#fff', band: '#14b8a6' },
    duft: { bg: '#e11d2e', fg: '#fff', band: '#2563eb' },
    co2: { bg: '#e11d2e', fg: '#fff', band: '#111827', horn: true },
    slanga: { bg: '#e11d2e', fg: '#fff' },
    neydarutgangur: { bg: '#15803d', fg: '#fff' },
    ut: { bg: '#15803d', fg: '#fff' },
    hose: { bg: '#e11d2e', fg: '#fff' },
    rafmagn: { bg: '#eab308', fg: '#1c1917' },
    skilti_slt: { bg: '#e11d2e', fg: '#fff' },
    skilti_slanga: { bg: '#e11d2e', fg: '#fff' },
    reykskynjari: { bg: '#e11d2e', fg: '#fff' },
    bjalla: { bg: '#e11d2e', fg: '#fff' },
    segull: { bg: '#e11d2e', fg: '#fff' },
    hitaskynjari: { bg: '#e11d2e', fg: '#fff' },
    annad: { bg: '#e11d2e', fg: '#fff' }
  };
  const STIMPIL_LYKILL = {
    'neyðarútgangur': 'neydarutgangur', ut: 'ut', hose: 'hose',
    rafmagn: 'rafmagn', skilti_slt: 'skilti_slt', skilti_slanga: 'skilti_slanga',
    reykskynjari: 'reykskynjari', hitaskynjari: 'hitaskynjari', bjalla: 'bjalla', segull: 'segull'
  };

  const SKIP_EI = /AREIM|REIM|REI.?M/;

  function parseFirewallRating(raw) {
    const compact = String(raw == null ? '' : raw).toUpperCase()
      .replace(/[O]/g, '0').replace(/[!|]/g, 'I').replace(/[^A-Z0-9]/g, '');
    if (!compact || SKIP_EI.test(compact)) return null;
    if (/120|90/.test(compact) && !/(?:30|60)/.test(compact)) return null;
    const match = compact.match(/^(?:REI|EICS|EIC|EI|E1|E)(CS)?(30|60)$/) ||
      compact.match(/^(?:REI|EICS|EIC|EI|E1|E)(30|60)(CS)$/);
    if (!match) return null;
    const minutes = Number(match[2] === 'CS' ? match[1] : match[2]);
    if (minutes !== 30 && minutes !== 60) return null;
    const smoke = match[1] === 'CS' || match[2] === 'CS' || compact.indexOf('CS') >= 0;
    return { minutes, smoke, label: smoke ? ('EI-CS-' + minutes) : ('EI-' + minutes) };
  }

  function sameLine(a, b) {
    if (a.horn != null && b.horn != null) {
      let d = Math.abs(a.horn - b.horn) % Math.PI;
      if (d > Math.PI / 2) d = Math.PI - d;
      if (d > 0.4) return false;
      const cax = a.x + a.width / 2, cay = a.y + a.height / 2;
      const cbx = b.x + b.width / 2, cby = b.y + b.height / 2;
      const ux = Math.cos(a.horn), uy = Math.sin(a.horn);
      return Math.abs((cbx - cax) * (-uy) + (cby - cay) * ux) <= Math.max(12, a.height, b.height);
    }
    if (a.vertical !== b.vertical) return false;
    if (a.vertical) return Math.abs(a.x + a.width / 2 - (b.x + b.width / 2)) <= Math.max(10, a.width);
    return Math.abs(a.y + a.height / 2 - (b.y + b.height / 2)) <= Math.max(10, a.height);
  }
  function gap(a, b) {
    if (a.horn != null) {
      const ux = Math.cos(a.horn), uy = Math.sin(a.horn);
      const aEnd = (a.x + a.width / 2) + ux * (a.width / 2);
      const b0 = (b.x + b.width / 2) - ux * (b.width / 2);
      const ay = (a.y + a.height / 2) + uy * (a.width / 2);
      const by = (b.y + b.height / 2) - uy * (b.width / 2);
      return Math.hypot(b0 - aEnd, by - ay);
    }
    if (a.vertical) return b.y - (a.y + a.height);
    return b.x - (a.x + a.width);
  }
  function collectFirewallHits(words) {
    const sorted = words.slice().sort((a, b) => {
      if (a.vertical !== b.vertical) return a.vertical ? 1 : -1;
      if (a.vertical) return a.x - b.x || a.y - b.y;
      return a.y - b.y || a.x - b.x;
    });
    const merged = [];
    sorted.forEach(word => {
      const prev = merged[merged.length - 1];
      if (prev && sameLine(prev, word) && gap(prev, word) < Math.max(22, (prev.vertical ? prev.height : prev.width) * 0.8)) {
        const minX = Math.min(prev.x, word.x), minY = Math.min(prev.y, word.y);
        merged[merged.length - 1] = {
          text: prev.text + ' ' + word.text, x: minX, y: minY,
          width: Math.max(prev.x + prev.width, word.x + word.width) - minX,
          height: Math.max(prev.y + prev.height, word.y + word.height) - minY,
          confidence: Math.max(prev.confidence, word.confidence),
          vertical: prev.vertical, horn: prev.horn
        };
      } else merged.push(Object.assign({}, word));
    });
    const hits = [];
    merged.concat(sorted).forEach(word => {
      const rating = parseFirewallRating(word.text);
      if (rating) hits.push(Object.assign({}, word, { rating }));
    });
    const ordered = hits.slice().sort((a, b) => b.confidence - a.confidence);
    const kept = [];
    ordered.forEach(hit => {
      const cx = hit.x + hit.width / 2, cy = hit.y + hit.height / 2;
      const dup = kept.some(o => {
        if (o.rating.label !== hit.rating.label) return false;
        const ox = o.x + o.width / 2, oy = o.y + o.height / 2;
        return (cx - ox) * (cx - ox) + (cy - oy) * (cy - oy) < 70 * 70;
      });
      if (!dup) kept.push(hit);
    });
    return kept;
  }

  function snuaHnit(word, rot, W, H) {
    if (rot === 90) return { x: word.y, y: H - (word.x + word.width), width: word.height, height: word.width, vertical: true, horn: -Math.PI / 2 };
    if (rot === 180) return { x: W - (word.x + word.width), y: H - (word.y + word.height), width: word.width, height: word.height, vertical: false, horn: Math.PI };
    if (rot === 270) return { x: W - (word.y + word.height), y: word.x, width: word.height, height: word.width, vertical: true, horn: Math.PI / 2 };
    return { x: word.x, y: word.y, width: word.width, height: word.height, vertical: !!word.vertical, horn: word.horn || 0 };
  }

  const kjarni = { parseFirewallRating, collectFirewallHits, snuaHnit };
  if (typeof module !== 'undefined' && module.exports) module.exports = kjarni;
  if (typeof window === 'undefined') return;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function val() {
    const s = (window.AppSettings && AppSettings.get && AppSettings.get('teikning_takn')) || {};
    const ut = {};
    Object.keys(SJALF).forEach(k => { ut[k] = (GLYFF.indexOf(s[k]) >= 0) ? s[k] : SJALF[k]; });
    return ut;
  }
  function fingrafar() { return JSON.stringify(val()); }

  // 06.10.2026: NFKD (ekki NFD) svo lækkaða 2-an í „CO₂" verði 2 — 39 kolsýrutæki lentu annars í „Annað";
  // „Slönguskápur" (slöng-) er slanga. Sama regla í TurboPaint (kjarni merkjasafn.ts) — prófið þar ber þær saman.
  function fjold(u) {
    const t = String((u && (u.type || u.tegund || u.nafn)) || '').toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    if (/co2|kolsyr/.test(t)) return 'co2';
    if (/duft|abc|pfc/.test(t)) return 'duft';
    if (/slang|slong/.test(t)) return 'slanga';
    if (/lettvatn|vatn|abf|frod/.test(t)) return 'lettvatn';
    return 'annad';
  }
  function lykillFyrir(m, units) {
    if (m && m.takn) {
      if (STIMPIL_LYKILL[m.takn]) return STIMPIL_LYKILL[m.takn];
      if (SJALF[m.takn] || LITIR[m.takn]) return m.takn;
    }
    if (m && (m.kind === 'sign' || (typeof m.unitId === 'string' && String(m.unitId).indexOf('s:') === 0))) {
      return STIMPIL_LYKILL[m.sign] || 'annad';
    }
    const u = (units || []).find(q => q && q.id === m.unitId);
    return fjold(u);
  }

  function teiknaGlyff(ctx, id, fg, outline, litur) {
    const strok = () => { ctx.strokeStyle = fg; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); };
    const fyll = () => {
      ctx.fillStyle = fg;
      if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 0.9; ctx.fill(); ctx.stroke(); }
      else ctx.fill();
    };
    const box = (x, y, w, h, r) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r || 0);
      else ctx.rect(x, y, w, h);
    };
    switch (id) {
      case 'hose':
        ctx.beginPath(); ctx.arc(12, 13, 6.5, 0, 7); strok();
        ctx.beginPath(); ctx.arc(12, 13, 2.2, 0, 7); fyll();
        ctx.beginPath(); ctx.moveTo(12, 6.5); ctx.lineTo(12, 3); ctx.lineTo(16, 3); strok();
        break;
      case 'sign-extinguisher':
        box(10, 6, 4, 8, 0); fyll(); box(11, 4.5, 2.2, 2, 0); fyll();
        break;
      case 'sign-hose':
        ctx.beginPath(); ctx.arc(12, 11, 5, 0, 7); strok();
        break;
      case 'exit':
        box(4, 6, 8, 12, 0); ctx.strokeStyle = fg; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10, 12); ctx.lineTo(19, 12); strok();
        ctx.beginPath(); ctx.moveTo(15, 8); ctx.lineTo(19, 12); ctx.lineTo(15, 16); strok();
        break;
      case 'electric':
        ctx.beginPath(); ctx.moveTo(13, 4); ctx.lineTo(8, 13); ctx.lineTo(12, 13); ctx.lineTo(11, 20); ctx.lineTo(16, 10); ctx.lineTo(12, 10); ctx.closePath(); fyll();
        break;
      case 'hydrant':
        box(8, 8, 8, 11, 0); fyll(); box(6, 11, 12, 3, 0); fyll(); box(10, 4, 4, 4, 0); fyll();
        break;
      case 'pin':
        ctx.beginPath(); ctx.arc(12, 9, 5, 0, 7); fyll();
        ctx.beginPath(); ctx.moveTo(12, 14); ctx.lineTo(12, 20); strok();
        break;
      case 'alarm':
        box(6, 6, 12, 12, 0); ctx.strokeStyle = fg; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.beginPath(); ctx.arc(12, 12, 3, 0, 7); fyll();
        break;
      case 'magnet':
        ctx.beginPath(); ctx.moveTo(7.5, 18); ctx.lineTo(7.5, 10.5); ctx.arc(12, 10.5, 4.5, Math.PI, 0); ctx.lineTo(16.5, 18);
        ctx.strokeStyle = fg; ctx.lineWidth = 3.4; ctx.lineCap = 'butt'; ctx.lineJoin = 'round'; ctx.stroke();
        break;
      case 'detector':
        ctx.beginPath(); ctx.arc(12, 12, 7, 0, 7); strok();
        ctx.beginPath(); ctx.arc(12, 12, 2.4, 0, 7); fyll();
        break;
      default: {
        // Slökkvitæki: kútur með ávölum öxlum, borði í lit tegundar, háls, handfang, þrýstimælir og slanga (CO₂: trekt).
        const band = litur && litur.band, kutur = () => box(7.6, 8.4, 7.6, 12.6, 2.6);
        kutur(); ctx.fillStyle = fg; ctx.fill();
        ctx.save(); kutur(); ctx.clip();
        if (band) { ctx.fillStyle = band; ctx.fillRect(7.6, 12.4, 7.6, 3.9); }
        ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(13.3, 8.4, 1.9, 12.6);              // skuggi hægra megin: rúmtak
        ctx.restore();
        box(9.9, 6.1, 3, 2.7, 0.5); ctx.fillStyle = fg; ctx.fill();                          // háls
        ctx.strokeStyle = fg; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(8.6, 5.5); ctx.lineTo(14.6, 4.1); ctx.stroke();   // handfang
        ctx.beginPath(); ctx.arc(8.5, 7.4, 1.05, 0, 7); ctx.fillStyle = fg; ctx.fill();      // þrýstimælir
        if (litur && litur.horn) {
          ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(12.9, 7.3); ctx.lineTo(16.2, 8.4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(15.8, 7.6); ctx.lineTo(19.8, 8.6); ctx.lineTo(19.4, 14.6); ctx.lineTo(16.4, 11.4); ctx.closePath(); ctx.fillStyle = fg; ctx.fill();
        } else {
          ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(12.9, 7.2); ctx.quadraticCurveTo(18.6, 6.8, 18.3, 12.4); ctx.stroke();
          box(17.35, 12.1, 1.9, 2.5, 0.4); ctx.fillStyle = fg; ctx.fill();
        }
      }
    }
  }

  function blanda(a, b, t) {
    const h = c => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c)); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const A = h(a), B = h(b);
    if (!A || !B) return a;                                   // litur sem er ekki #rrggbb (handvalinn): óblandaður
    return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')';
  }

  function teiknaTakn(ctx, glyffId, litur, x, y, size, rot) {
    ctx.save();
    ctx.translate(x, y);
    const deg = Number(rot) || 0;
    if (deg) ctx.rotate(deg * Math.PI / 180);
    ctx.translate(-size / 2, -size / 2);
    // MÁLMPLATA (Brunastál, 05.10.2026): hvítur kragi svo merkið lesist á hvaða fleti sem er, litur með halla frá
    // ljósu horni í dökkt, mjó gljárák á ská, dökk brún og ljós rönd að innan. Áður: flatur litur með svörtum ramma.
    const r = size * 0.2, bg = litur.bg || '#e11d2e';
    const plata = (inn) => { ctx.beginPath(); const i = inn || 0; if (ctx.roundRect) ctx.roundRect(i, i, size - 2 * i, size - 2 * i, Math.max(0, r - i)); else ctx.rect(i, i, size - 2 * i, size - 2 * i); };
    plata();
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = Math.max(3, size * 0.2);
    ctx.shadowOffsetY = Math.max(1, size * 0.05);
    ctx.fillStyle = bg; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.96)'; ctx.lineWidth = Math.max(2.4, size / 8.5); ctx.stroke();
    const halli = ctx.createLinearGradient(0, 0, size * 0.6, size);
    halli.addColorStop(0, blanda(bg, '#ffffff', 0.24)); halli.addColorStop(0.42, bg); halli.addColorStop(1, blanda(bg, '#000000', 0.42));
    plata(); ctx.fillStyle = halli; ctx.fill();
    ctx.save(); plata(); ctx.clip();
    const gljai = ctx.createLinearGradient(0, 0, size, size * 0.7);
    gljai.addColorStop(0.26, 'rgba(255,255,255,0)'); gljai.addColorStop(0.38, 'rgba(255,255,255,.24)'); gljai.addColorStop(0.47, 'rgba(255,255,255,0)');
    ctx.fillStyle = gljai; ctx.fillRect(0, 0, size, size);
    ctx.restore();
    plata(); ctx.strokeStyle = blanda(bg, '#000000', 0.66); ctx.lineWidth = Math.max(1.1, size / 22); ctx.stroke();
    plata(Math.max(1.2, size / 16)); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = Math.max(0.7, size / 44); ctx.stroke();
    ctx.scale(size / 24, size / 24);
    teiknaGlyff(ctx, glyffId, litur.fg, litur.outline, litur);
    ctx.restore();
  }

  function teiknaISpan(span, def) {
    if (!span) return;
    const c = document.createElement('canvas');
    c.width = 44; c.height = 44; c.style.cssText = 'width:22px;height:22px;display:block';
    const lyk = STIMPIL_LYKILL[def && def.id] || ((def && SJALF[def.id]) ? def.id : 'annad');
    const litur = Object.assign({}, LITIR[lyk] || LITIR.annad, def && def.litur ? { bg: def.litur } : {});
    teiknaTakn(c.getContext('2d'), (val()[lyk] || (def && def.glyff) || 'extinguisher'), litur, 22, 22, 40);
    span.innerHTML = ''; span.style.background = 'transparent'; span.appendChild(c);
  }

  function teiknaMerki(ctx, m, mx, my, s, units) {
    const lyk = lykillFyrir(m, units);
    const litur = Object.assign({}, LITIR[lyk] || LITIR.annad, m.color && lyk !== 'lettvatn' && lyk !== 'duft' && lyk !== 'co2' ? { bg: m.color } : {});
    teiknaTakn(ctx, val()[lyk] || SJALF[lyk] || 'extinguisher', litur, mx, my, s, m && m.rot);
  }

  function teiknaOfan(F) {
    const canvas = document.getElementById('fp-canvas');
    if (!canvas || !F || !F.bgImage) return;
    const plan = F.plans && F.plans[F.companyId];
    if (!plan || !plan.markers || !plan.markers.length) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    const main = document.getElementById('fp-main');
    const cr = canvas.getBoundingClientRect();
    // Tæki eru teiknuð í strigapunktum; CSS-þysjun 383 skalast ofan á. stimpilPx
    // fær CSS-breiddina (með zoom) og reiknar sjálft 100%-stærðina.
    const sc = main ? Math.min((main.offsetWidth - 10) / cw, (main.offsetHeight - 10) / ch) : 1;
    const sjalf = (window.TeiknSja && TeiknSja.taknPx)
      ? TeiknSja.taknPx(cw, sc)
      : Math.max(22, Math.round(cw / 70), (sc > 0 && isFinite(sc)) ? Math.round(26 / sc) : 26);
    const units = F.units || [];
    plan.markers.forEach(mk => {
      if (mk.kind === 'sign' || (typeof mk.unitId === 'string' && String(mk.unitId).indexOf('s:') === 0)) return;
      const x = mk.x || 0, y = mk.y || 0;
      const mx = (x > 1 || y > 1) ? x : x * cw;
      const my = (x > 1 || y > 1) ? y : y * ch;
      let size = sjalf;
      if (window.TeiknMerking && TeiknMerking.stimpilPx) {
        const css = TeiknMerking.stimpilPx(mk, cr.width);
        if (css && sc > 0) size = css / sc;
      }
      teiknaMerki(ctx, mk, mx, my, size, units);
    });
  }

  function vefjaStriga() {
    const F = window.FloorPlan;
    if (!F || typeof F._renderCanvas !== 'function') return false;
    if (F._renderCanvas.__takn) return true;
    const orig = F._renderCanvas.bind(F);
    const wrap = function () { orig(); try { teiknaOfan(this); } catch (_) {} };
    wrap.__takn = 1;
    F._renderCanvas = wrap;
    return true;
  }

  /* ── Stillingar ── */
  function stillingarHTML() {
    const v = val();
    const rod = (lyk, nafn, lysing) =>
      '<div class="t434-rod" data-lyk="' + esc(lyk) + '">' +
        '<div class="t434-nafn">' + esc(nafn) + '<span>' + esc(lysing) + '</span></div>' +
        '<div class="t434-val">' + GLYFF.map(g =>
          '<button type="button" class="t434-g' + (v[lyk] === g ? ' on' : '') + '" data-g="' + g + '" title="' + esc(GLYFF_NOFN[g]) + '"></button>'
        ).join('') + '</div></div>';
    const gaedi = (window.TeiknGaedi && TeiknGaedi.gaediHTML) ? TeiknGaedi.gaediHTML() : '';
    return '<div class="t434">' +
      gaedi +
      '<p class="t434-inng">Táknin gilda á öllum teikningum, á öllum tækjum. Tæki draga tákn af tegund; merki (skilti, útgangur, tafla) eru merki, ekki tækjaraðir.</p>' +
      '<div class="su-section-title">Tæki</div>' +
      rod('lettvatn', 'Léttvatn', 'Slökkvitæki á teikningunni') +
      rod('duft', 'Duft', 'ABC-duft') +
      rod('co2', 'CO₂', 'Kolsýra') +
      rod('slanga', 'Slanga', 'Brunaslanga / kefli sem tæki') +
      '<div class="su-section-title">Merki</div>' +
      rod('neydarutgangur', 'Neyðarútgangur', 'Grænt flóttamerki') +
      rod('ut', 'Út', 'Út-skilti') +
      rod('hose', 'Slöngumerki', 'Staðsetning slöngu án tækjaraðar') +
      rod('rafmagn', 'Rafmagnstafla', 'Viðvörun, ekki tæki') +
      rod('skilti_slt', 'Skilti slökkvitæki', 'ISO-skilti, ekki slökkvitækið sjálft') +
      rod('skilti_slanga', 'Skilti brunaslanga', 'ISO-skilti, ekki slangan sjálf') +
      '<div id="t434-stada" class="su-hint"></div></div>';
  }
  function malaGlyffTakka(body) {
    body.querySelectorAll('.t434-g').forEach(b => {
      const c = document.createElement('canvas'); c.width = 48; c.height = 48;
      c.style.cssText = 'width:28px;height:28px;display:block';
      const lyk = b.closest('.t434-rod').dataset.lyk;
      teiknaTakn(c.getContext('2d'), b.dataset.g, LITIR[lyk] || LITIR.annad, 24, 24, 44);
      b.innerHTML = ''; b.appendChild(c);
    });
  }
  function stillCss() {
    if (document.getElementById('t434-css')) return;
    const st = document.createElement('style'); st.id = 't434-css';
    st.textContent =
      '.t434{max-width:720px}.t434-inng{font-size:12.5px;color:#64748b;line-height:1.5;margin:0 0 12px}' +
      '.t434-rod{display:grid;grid-template-columns:160px 1fr;gap:10px;align-items:center;margin-bottom:10px}' +
      '.t434-nafn{font-size:13px;font-weight:700;color:#0f172a}.t434-nafn span{display:block;font-size:11px;font-weight:500;color:#94a3b8}' +
      '.t434-val{display:flex;flex-wrap:wrap;gap:6px}' +
      '.t434-g{width:36px;height:36px;padding:3px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;cursor:pointer}' +
      '.t434-g.on{border-color:#c9a54a;box-shadow:0 0 0 2px rgba(201,165,74,.35)}' +
      '.t434-gaedi{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}' +
      '.t434-gq{padding:7px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font:600 12.5px system-ui,sans-serif;color:#334155}' +
      '.t434-gq.on{border-color:#c9a54a;background:#fbf6e8;color:#14120f;box-shadow:0 0 0 2px rgba(201,165,74,.28)}' +
      '.fp-ei-btn[aria-pressed="true"]{background:#c9a54a!important;color:#14120f!important}';
    document.head.appendChild(st);
  }
  async function vistaTakn(lyk, g) {
    const next = Object.assign({}, val(), { [lyk]: g });
    const ok = window.AppSettings && AppSettings.save ? await AppSettings.save({ teikning_takn: next }) : false;
    const st = document.getElementById('t434-stada');
    if (st) st.textContent = ok ? 'Vistað — gildir á öllum tækjum.' : 'Gat ekki vistað. Reyndu aftur.';
    const rod = document.querySelector('.t434-rod[data-lyk="' + lyk + '"]');
    if (rod) rod.querySelectorAll('.t434-g').forEach(b => b.classList.toggle('on', b.dataset.g === g));
    try { if (window.FloorPlan && FloorPlan._renderCanvas) FloorPlan._renderCanvas(); } catch (_) {}
    try { if (window.TeiknBord) { const y = document.getElementById('fp-yfirlag'); if (y) y._t433 = ''; } } catch (_) {}
    const r = document.getElementById('fp-stimpil'); if (r) r.dataset.ok = '';
    try { if (window.TeiknMerking && TeiknMerking.tikk) TeiknMerking.tikk(); } catch (_) {}
  }
  function skraStillingar() {
    if (!window.SettingsUI || typeof SettingsUI.registerSection !== 'function') return false;
    return SettingsUI.registerSection({
      id: 'teikning_takn', hopur: 'Vinnusvæði', nafn: 'Tákn á teikningu',
      lysing: 'Gæði teikningarinnar og tákn fyrir léttvatn, duft, CO₂, slöngu og merki.',
      ord: 'teikning tákn gæði forskoðun miðlungs fullt léttvatn duft co2 slanga skilti rafmagnstafla ei',
      render: body => {
        stillCss();
        body.innerHTML = stillingarHTML();
        malaGlyffTakka(body);
        body.querySelectorAll('.t434-g').forEach(b => {
          b.addEventListener('click', () => {
            const lyk = b.closest('.t434-rod').dataset.lyk;
            vistaTakn(lyk, b.dataset.g);
          });
        });
        body.querySelectorAll('.t434-gq').forEach(b => {
          b.addEventListener('click', () => {
            if (window.TeiknGaedi && TeiknGaedi.setja) TeiknGaedi.setja(b.getAttribute('data-q'));
            body.querySelectorAll('.t434-gq').forEach(x => x.classList.toggle('on', x.getAttribute('data-q') === b.getAttribute('data-q')));
          });
        });
      }
    });
  }

  /* ── EI-ábendingar ── */
  const EI = { bid: 0, syn: true };
  // EI-ábendingar sjást ekki lengur í teikningaglugganum — greiningin býr í TurboPaint (Agnar 03.10.2026: „tekið út … EI“).
  function eiSyn() { return false; }
  function setjaEiSyn(a) { try { localStorage.setItem('teikn_ei_syn', a ? '1' : '0'); } catch (_) {} }
  function inTitleBlock(hit, W, H) {
    const cx = hit.x + hit.width / 2, cy = hit.y + hit.height / 2;
    return cx > W * 0.84 && cy > H * 0.45;
  }
  function hintarUrHits(hits, W, H) {
    return hits.filter(h => !inTitleBlock(h, W, H)).map(h => ({
      x: h.x + h.width / 2, y: h.y + h.height / 2,
      label: h.rating.label, minutes: h.rating.minutes,
      horn: h.horn != null ? h.horn : (h.vertical ? -Math.PI / 2 : 0),
      w: h.width, h: h.height
    }));
  }

  async function lesaUrPdf(sida, vp, kx, ky, h) {
    if (!sida || !h) return [];
    let tc;
    try { tc = await sida.getTextContent(); } catch (_) { return []; }
    const vt = vp.transform;
    const mul = (m) => [
      vt[0] * m[0] + vt[2] * m[1], vt[1] * m[0] + vt[3] * m[1],
      vt[0] * m[2] + vt[2] * m[3], vt[1] * m[2] + vt[3] * m[3],
      vt[0] * m[4] + vt[2] * m[5] + vt[4], vt[1] * m[4] + vt[3] * m[5] + vt[5]
    ];
    const words = [];
    (tc.items || []).forEach(it => {
      const t = String(it.str || '').trim();
      if (!t) return;
      const M = mul(it.transform || [1, 0, 0, 1, 0, 0]);
      const x = M[4] * kx, y = M[5] * ky;
      const font = Math.hypot(M[0], M[1]) || 8;
      const w = Math.max(6, (it.width || font) * kx * (Math.hypot(vt[0], vt[1]) || 1));
      const hh = Math.max(5, font * ky * 0.85);
      const horn = Math.atan2(M[1], M[0]);
      const ad = Math.abs(horn) % Math.PI;
      const vertical = Math.abs(ad - Math.PI / 2) < 0.35;
      words.push({ text: t, x: x - w / 2, y: y - hh / 2, width: w, height: hh, confidence: 88, vertical, horn });
    });
    const iw = (h.frum && h.frum.b) || 4000, ih = (h.frum && h.frum.h) || 3000;
    const hits = collectFirewallHits(words);
    h.eiHintar = hintarUrHits(hits, iw, ih);
    h.eiHeimild = h.eiHintar.length ? 'pdf' : h.eiHeimild;
    return h.eiHintar;
  }

  function sniðMal(texti, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#000'; x.font = 'bold ' + Math.round(h * 0.78) + 'px sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(texti, w / 2, h / 2 + 1);
    const d = x.getImageData(0, 0, w, h).data, bin = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) bin[i] = d[i * 4] < 140 ? 1 : 0;
    return { bin, w, h };
  }
  function beram(a, b) {
    let same = 0, ink = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) { if (a[i] || b[i]) { ink++; if (a[i] === b[i]) same++; } }
    return ink ? same / ink : 0;
  }
  function skalaBin(src, sw, sh, dw, dh) {
    const ut = new Uint8Array(dw * dh);
    for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor(x * sw / dw)), sy = Math.min(sh - 1, Math.floor(y * sh / dh));
      ut[y * dw + x] = src[sy * sw + sx];
    }
    return ut;
  }

  async function lesaUrMynd(mynd, h, veggir) {
    if (!mynd || !h) return h.eiHintar || [];
    if (h.eiHeimild === 'pdf' && (h.eiHintar || []).length) return h.eiHintar;
    if (h.eiMyndLykill === ((mynd.src || '') + ':' + (mynd.width || 0)) && h.eiHintar) return h.eiHintar;
    const bid = ++EI.bid;
    const iw = mynd.naturalWidth || mynd.width, ih = mynd.naturalHeight || mynd.height;
    const kv = Math.min(1, 1400 / Math.max(iw, ih));
    const W = Math.max(1, Math.round(iw * kv)), H = Math.max(1, Math.round(ih * kv));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(mynd, 0, 0, W, H);
    const snið30 = sniðMal('EI-30', 72, 24), snið60 = sniðMal('EI-60', 72, 24);
    const words = [];

    function snua90cw(src) {
      const dst = document.createElement('canvas'); dst.width = src.height; dst.height = src.width;
      const t = dst.getContext('2d'); t.translate(src.height, 0); t.rotate(Math.PI / 2); t.drawImage(src, 0, 0);
      return dst;
    }
    function snua90ccw(src) {
      const dst = document.createElement('canvas'); dst.width = src.height; dst.height = src.width;
      const t = dst.getContext('2d'); t.translate(0, src.width); t.rotate(-Math.PI / 2); t.drawImage(src, 0, 0);
      return dst;
    }
    async function lesaSnun(src, rot) {
      if (bid !== EI.bid) return;
      const d = src.getContext('2d').getImageData(0, 0, src.width, src.height);
      const gra = d.data, vis = new Uint8Array(src.width * src.height);
      for (let i = 0; i < vis.length; i++) {
        const j = i * 4, lum = (gra[j] * 77 + gra[j + 1] * 150 + gra[j + 2] * 29) >> 8;
        vis[i] = lum < 140 ? 1 : 0;
      }
      const seen = new Uint8Array(vis.length);
      const klasar = [];
      for (let y = 0; y < src.height; y++) for (let px = 0; px < src.width; px++) {
        const i0 = y * src.width + px;
        if (!vis[i0] || seen[i0]) continue;
        let x0 = px, x1 = px, y0 = y, y1 = y, n = 0;
        const q = [i0]; seen[i0] = 1;
        while (q.length) {
          const i = q.pop(), xx = i % src.width, yy = (i - xx) / src.width;
          n++; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
          [[xx - 1, yy], [xx + 1, yy], [xx, yy - 1], [xx, yy + 1]].forEach(p => {
            if (p[0] < 0 || p[1] < 0 || p[0] >= src.width || p[1] >= src.height) return;
            const ii = p[1] * src.width + p[0];
            if (vis[ii] && !seen[ii]) { seen[ii] = 1; q.push(ii); }
          });
        }
        const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
        if (n < 18 || n > 900 || bw < 8 || bh < 5) continue;
        const ar = bw / bh;
        if (!((ar > 1.4 && ar < 8) || (ar > 0.12 && ar < 0.72))) continue;
        klasar.push({ x0, y0, bw, bh, n });
        if (klasar.length > 700) break;
      }
      klasar.forEach(k => {
        const pad = 2, sx0 = Math.max(0, k.x0 - pad), sy0 = Math.max(0, k.y0 - pad);
        const sw = Math.min(src.width - sx0, k.bw + pad * 2), sh = Math.min(src.height - sy0, k.bh + pad * 2);
        const crop = new Uint8Array(sw * sh);
        for (let yy = 0; yy < sh; yy++) for (let xx = 0; xx < sw; xx++) crop[yy * sw + xx] = vis[(sy0 + yy) * src.width + (sx0 + xx)];
        const ligg = k.bw >= k.bh;
        const tw = ligg ? 72 : 24, th = ligg ? 24 : 72;
        const scaled = skalaBin(crop, sw, sh, tw, th);
        const a30 = ligg ? snið30.bin : skalaBin(snið30.bin, 72, 24, 24, 72);
        const a60 = ligg ? snið60.bin : skalaBin(snið60.bin, 72, 24, 24, 72);
        const p30 = beram(scaled, a30), p60 = beram(scaled, a60);
        const best = p30 >= p60 ? { p: p30, t: 'EI-30' } : { p: p60, t: 'EI-60' };
        if (best.p < 0.58) return;
        const mapped = snuaHnit({
          x: sx0, y: sy0, width: sw, height: sh, confidence: Math.round(best.p * 100), vertical: !ligg, text: best.t
        }, rot, W, H);
        mapped.x /= kv; mapped.y /= kv; mapped.width /= kv; mapped.height /= kv;
        mapped.text = best.t; mapped.confidence = Math.round(best.p * 100);
        words.push(mapped);
      });
      await new Promise(r => setTimeout(r, 0));
    }

    await lesaSnun(c, 0);
    if (bid !== EI.bid) return h.eiHintar || [];
    let r90 = snua90cw(c);
    await lesaSnun(r90, 90);
    r90.width = 0; r90.height = 0;
    if (bid !== EI.bid) return h.eiHintar || [];
    const r180 = document.createElement('canvas'); r180.width = W; r180.height = H;
    const x180 = r180.getContext('2d'); x180.translate(W, H); x180.rotate(Math.PI); x180.drawImage(c, 0, 0);
    await lesaSnun(r180, 180);
    r180.width = 0; r180.height = 0;
    if (bid !== EI.bid) return h.eiHintar || [];
    let r270 = snua90ccw(c);
    await lesaSnun(r270, 270);
    r270.width = 0; r270.height = 0;

    const veggjalisti = (veggir || []).concat(h.veggir || []).concat(h.pdfVeggir || []);
    const langir = veggjalisti.filter(v => Math.hypot(v[2] - v[0], v[3] - v[1]) > 80)
      .sort((a, b) => Math.hypot(b[2] - b[0], b[3] - b[1]) - Math.hypot(a[2] - a[0], a[3] - a[1]))
      .slice(0, 50);
    for (let i = 0; i < langir.length; i++) {
      if (bid !== EI.bid) return h.eiHintar || [];
      const v = langir[i], lengd = Math.hypot(v[2] - v[0], v[3] - v[1]);
      const horn = Math.atan2(v[3] - v[1], v[2] - v[0]);
      const tw = Math.max(20, Math.round(lengd * kv)), th = 22;
      const strip = document.createElement('canvas'); strip.width = tw; strip.height = th;
      const sx = strip.getContext('2d');
      sx.translate(0, th / 2); sx.rotate(-horn); sx.translate(-v[0] * kv, -v[1] * kv); sx.drawImage(c, 0, 0);
      const idata = sx.getImageData(0, 0, tw, th).data;
      const win = 72;
      for (let ox = 0; ox < tw - win; ox += 10) {
        const crop = new Uint8Array(win * th);
        for (let yy = 0; yy < th; yy++) for (let xx = 0; xx < win; xx++) {
          const j = ((yy * tw + ox + xx) * 4);
          crop[yy * win + xx] = idata[j] < 140 ? 1 : 0;
        }
        const scaled = skalaBin(crop, win, th, 72, 24);
        const p30 = beram(scaled, snið30.bin), p60 = beram(scaled, snið60.bin);
        const best = p30 >= p60 ? { p: p30, t: 'EI-30' } : { p: p60, t: 'EI-60' };
        if (best.p < 0.62) continue;
        const mx = v[0] + Math.cos(horn) * ((ox + win / 2) / kv);
        const my = v[1] + Math.sin(horn) * ((ox + win / 2) / kv);
        words.push({ text: best.t, x: mx - 20, y: my - 8, width: 40, height: 16, confidence: Math.round(best.p * 100), vertical: Math.abs(Math.sin(horn)) > 0.7, horn });
      }
      if (i % 8 === 7) await new Promise(r => setTimeout(r, 0));
    }

    if (bid !== EI.bid) return h.eiHintar || [];
    const hits = collectFirewallHits(words);
    h.eiHintar = hintarUrHits(hits, iw, ih);
    h.eiHeimild = h.eiHintar.length ? (h.eiHeimild === 'pdf' ? 'pdf' : 'mynd') : h.eiHeimild;
    h.eiMyndLykill = (mynd.src || '') + ':' + (mynd.width || 0);
    return h.eiHintar;
  }

  function teiknaEi(ctx, sx, sy, k, h) {
    if (!eiSyn() || !h || !h.eiHintar) return;
    h.eiHintar.forEach(t => {
      const x = sx(t.x), y = sy(t.y);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t.horn || 0);
      const fs = Math.max(9, Math.min(15, 11 * Math.max(k, 0.6)));
      ctx.font = '700 ' + fs + 'px system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.strokeText(t.label, 0, 0);
      ctx.fillStyle = t.minutes === 60 ? '#d32f2f' : '#ef5350';
      ctx.fillText(t.label, 0, 0);
      ctx.restore();
    });
  }
  function eiFingrafar(h) {
    const n = (h && h.eiHintar) ? h.eiHintar.length : 0;
    return eiSyn() + ':' + n + ':' + ((h && h.eiHintar) || []).slice(0, 8).map(t => Math.round(t.x) + ',' + Math.round(t.y) + t.label).join(';');
  }

  function eiTakki() {
    stillCss();
    const grp = document.querySelector('#modal-floorplan .fp-hd-grp');
    if (!grp || grp.querySelector('.fp-ei-btn')) {
      const b = grp && grp.querySelector('.fp-ei-btn');
      if (b) { b.setAttribute('aria-pressed', String(eiSyn())); b.style.background = eiSyn() ? '#c9a54a' : ''; b.style.color = eiSyn() ? '#14120f' : ''; }
      return;
    }
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-outline btn-sm fp-ei-btn';
    b.textContent = 'EI-merki';
    b.title = 'Sýna EI-30 / EI-60 sem ábendingar við veggi. Eldveggir eru ekki stimplaðir.';
    b.setAttribute('aria-pressed', String(eiSyn()));
    if (eiSyn()) { b.style.background = '#c9a54a'; b.style.color = '#14120f'; }
    b.addEventListener('click', async () => {
      const FP = window.FloorPlan;
      if (!FP || !FP.bgImage) { try { if (window.Toast && Toast.show) Toast.show('Sæktu eða hlaðu upp teikningu fyrst.'); } catch (_) {} return; }
      if (eiSyn() && (virkEiHintar() || []).length) {
        setjaEiSyn(false);
        b.setAttribute('aria-pressed', 'false'); b.style.background = ''; b.style.color = '';
        hreinsaYfirlag();
        return;
      }
      setjaEiSyn(true);
      b.setAttribute('aria-pressed', 'true'); b.style.background = '#c9a54a'; b.style.color = '#14120f';
      b.textContent = 'EI…';
      try {
        const n = await keyraEiLestur(true);
        try { if (window.Toast && Toast.show) Toast.show(n ? ('Fann ' + n + ' EI-ábendingar. Eldveggir eru ekki stimplaðir.') : 'Fann engin EI-30/EI-60. Lestu veggi úr PDF eða prófaðu aðra hæð.'); } catch (_) {}
      } finally { b.textContent = 'EI-merki'; hreinsaYfirlag(); }
    });
    const eftir = grp.querySelector('.fp-hreinsa-btn');
    try { grp.insertBefore(b, eftir && eftir.nextSibling ? eftir.nextSibling : null); } catch (_) { grp.appendChild(b); }
  }
  function virkEiHintar() {
    try {
      const F = window.FloorPlan, p = F && F.plans[F.companyId];
      const hs = p && p.haedir;
      if (!hs || !hs.length) return (p && p.eiHintar) || [];
      const v = window.TeiknBord && typeof TeiknBord.virk === 'function' ? TeiknBord.virk() : 0;
      return (hs[v] && hs[v].eiHintar) || [];
    } catch (_) { return []; }
  }
  function hreinsaYfirlag() {
    try {
      const y = document.getElementById('fp-yfirlag');
      if (y) y._t433 = '';
      if (window.TeiknBord && TeiknBord._t433 !== undefined) { /* no-op */ }
    } catch (_) {}
  }
  async function keyraEiLestur(nauð) {
    const F = window.FloorPlan;
    if (!F || !F.bgImage) return 0;
    const p = F.plans[F.companyId]; if (!p) return 0;
    const hs = Array.isArray(p.haedir) && p.haedir.length ? p.haedir : [{ markers: p.markers, veggir: [], pdfVeggir: [] }];
    const ix = window.TeiknBord && typeof TeiknBord.virk === 'function' ? TeiknBord.virk() : 0;
    const h = hs[ix] || hs[0];
    if (!h) return 0;
    if (!nauð && (h.eiHintar || []).length) return h.eiHintar.length;
    const veggir = (h.veggir || []).concat(h.pdfVeggir || []);
    await lesaUrMynd(F.bgImage, h, veggir);
    return (h.eiHintar || []).length;
  }

  // KAPPHLAUP (mælt 06.10.2026): opnist Teikning áður en tækjalistinn (DB.cache.units) hefur hlaðist fær FloorPlan tóman
  // lista — öll tæki teiknast sem „Annað" (enginn borði, slöngur sem slökkvitæki) þar til glugginn er opnaður aftur.
  // Listinn er sóttur aftur um leið og tækin eru komin og striginn teiknaður upp á nýtt.
  let _taekiReynt = '';
  function taekiAftur() {
    const F = window.FloorPlan, m = document.getElementById('modal-floorplan');
    if (!F || !F.companyId || !m || !m.classList.contains('open') || (F.units && F.units.length)) return;
    const C = window.Companies, n = ((window.DB && DB.cache && DB.cache.units) || []).length;
    if (!C || typeof C._taekiAProfill !== 'function' || !n) return;
    const lyk = F.companyId + '|' + n; if (_taekiReynt === lyk) return; _taekiReynt = lyk;
    const c = (C.list || []).find(x => +x.id === +F.companyId);
    const u = c ? C._taekiAProfill(c) : [];
    if (!u.length) return;
    F.units = u;
    try { F._renderCanvas(); F._renderPanel(); } catch (_) {}
  }
  function tikk() {
    try { taekiAftur(); } catch (_) {}
    try { vefjaStriga(); } catch (_) {}
    try { eiTakki(); } catch (_) {}
    try { stillCss(); } catch (_) {}
  }

  window.TeiknTakn = {
    val, fingrafar, teiknaTakn, teiknaMerki, teiknaISpan, teiknaOfan, fjold, glyff: GLYFF, litir: LITIR
  };
  window.TeiknEi = Object.assign({}, kjarni, {
    lesaUrPdf, lesaUrMynd, teikna: teiknaEi, fingrafar: eiFingrafar, syn: eiSyn, keyra: keyraEiLestur
  });

  if (!skraStillingar()) { let n = 0; const i = setInterval(() => { if (skraStillingar() || ++n > 40) clearInterval(i); }, 400); }
  if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => { const r = document.getElementById('fp-stimpil'); if (r) r.dataset.ok = ''; try { vefjaStriga(); if (window.FloorPlan && FloorPlan._renderCanvas) FloorPlan._renderCanvas(); } catch (_) {} });
  setInterval(() => { try { tikk(); } catch (_) {} }, 500);
  new MutationObserver(() => { try { tikk(); } catch (_) {} }).observe(document.documentElement, { childList: true, subtree: true });
  tikk();
})();
