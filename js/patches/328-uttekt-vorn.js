/* === ÚTTEKTAR-VÖRN (328, 2026-08-30) ======================================
 *
 * YFIRREGLAN (Agnar, 30.08.2026):
 *   „Þetta er bara ritað í stein nema ég breyti sjálfur."
 *   „Þangað til er allt manual og helst óbreytt."
 *
 * Þegar úttekt er kláruð og reikningur ársins er til er niðurstaðan FÖST.
 * Ekkert í kerfinu má snerta hana af sjálfu sér. Þessi patch gerir tvennt:
 *
 *   LAG 1 — PASSÍF MERKING sem sést ALLTAF, áður en nokkur snertir takka:
 *           hvort úttektarskýrsla ársins er til og hvort reikningur ársins er
 *           til (með númeri, upphæð og greiðslustöðu). Hlutlaus þegar ekkert er
 *           til, gulur/rauður þegar það er til.
 *
 *   LAG 2 — BLOKKANDI GLUGGI ef samt er ýtt á „✓ Klára heimsókn". Sjálfgefni
 *           takkinn er „Hætta við". Að búa til annan reikning krefst þess að
 *           skrifa NÝR og ástæðan er skráð í solur.krafa_note.
 *
 * ÞETTA HEFUR ÞEGAR KOSTAÐ PENINGA. Húsf. Stóragerði 20 (#125) fékk R-000351 og
 * R-000417, báða 48.659 kr, báða senda og BÁÐA GREIDDA (Payday #34 og #112).
 * Húsfélagið á 48.659 kr inni — óendurgreitt. Vörnin er til að þetta gerist
 * ekki aftur, ekki til skrauts.
 *
 * Auk þess: „Byrja á <næsta ári> skýrslunni" — eina leiðin til að núllstilla
 * grænu hökin, meðvituð og með staðfestingu (ósk Agnars: „Það þarf engan
 * hreinsitakka. bara byrja á 2027 skýrslu þá fara öll grænu checkmarks í einu").
 *
 * Uppspretta stöðunnar er GAGNAGRUNNURINN, ekki skyndiminni: customer_documents
 * fyrir skýrsluna og solur (+ payday_invoices_slokk) fyrir reikninginn. 271
 * notar cache-að AppSettings og getur því verið á eftir.
 * ========================================================================== */
(() => {
  if (window.__uttektVorn328) return;
  window.__uttektVorn328 = true;

  const cache = new Map();          // "coId|year" -> { at, data }
  const TTL = 45000;                // 45 s — nógu ferskt, engin hamfarahleðsla

  function sb() { return (window.DB && DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function kr(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr'; }
  function dmy(s) {
    const d = String(s || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.slice(8) + '.' + d.slice(5, 7) : '';
  }

  /* Sama coId-uppfletting og 165/271 — ein staðreynd, þrír notendur. */
  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const idEl = main.querySelector('[data-co-id]:not(._cat-section)');
    if (idEl) { const v = idEl.getAttribute('data-co-id'); if (v && /^\d+$/.test(v)) return +v; }
    const btn = main.querySelector('button[onclick*="Companies.openEdit"]');
    const m = btn && btn.getAttribute('onclick').match(/openEdit\((\d+)/);
    return m ? +m[1] : null;
  }

  /* ── Staðan, beint úr grunni ─────────────────────────────────────────── */
  async function fetchStatus(coId, year) {
    const s = sb(); if (!s) return null;
    const out = { skyrsla: null, reikningur: null };
    try {
      const r = await s.from('customer_documents')
        .select('doc_date,drive_file_id')
        .eq('fyrirtaeki_id', coId).eq('year', year)
        .eq('doc_type', 'uttektarskyrsla')
        .or('is_duplicate.is.null,is_duplicate.eq.false')
        .limit(1);
      if (r.data && r.data.length) out.skyrsla = { dags: r.data[0].doc_date, drive: r.data[0].drive_file_id };
    } catch (_) {}
    try {
      const r = await s.from('solur')
        .select('num,created_at,samtals,krafa_sent_at,paid_at')
        .eq('source', 'uttekt').eq('customer_id', coId)
        .gte('created_at', year + '-01-01').lt('created_at', (year + 1) + '-01-01')
        .or('hidden.is.null,hidden.eq.false')
        .or('is_credit.is.null,is_credit.eq.false')
        .order('created_at', { ascending: false }).limit(1);
      if (r.data && r.data.length) {
        const v = r.data[0];
        out.reikningur = { num: v.num, dags: v.created_at, samtals: v.samtals,
                           krafa_sent: v.krafa_sent_at, greitt: v.paid_at, payday: null };
        // Greiðslustaðan kemur úr Payday-speglinum (reference heldur R-númerinu).
        try {
          const p = await s.from('payday_invoices_slokk')
            .select('number,status').eq('reference', v.num).limit(1);
          if (p.data && p.data.length) out.reikningur.payday = p.data[0];
        } catch (_) {}
      }
    } catch (_) {}
    return out;
  }
  async function statusFor(coId, year, force) {
    const key = coId + '|' + year;
    const hit = cache.get(key);
    if (!force && hit && (Date.now() - hit.at) < TTL) return hit.data;
    const data = await fetchStatus(coId, year);
    if (data) cache.set(key, { at: Date.now(), data });
    return data;
  }
  function cached(coId, year) {
    const hit = cache.get(coId + '|' + year);
    return hit ? hit.data : null;
  }

  /* ── LAG 1: passíf merking í svarta REIKNINGUR-hausnum ───────────────── */
  function pill(txt, tone) {
    const c = { hlutlaust: ['rgba(255,255,255,.12)', '#e7ebf2'],
                gult:      ['#fde68a', '#7c4a03'],
                raudt:     ['#fecaca', '#7f1d1d'],
                graent:    ['#bbf7d0', '#14532d'] }[tone] || ['rgba(255,255,255,.12)', '#e7ebf2'];
    return '<span style="background:' + c[0] + ';color:' + c[1] + ';font-size:10.5px;font-weight:800;' +
           'padding:3px 9px;border-radius:99px;white-space:nowrap">' + txt + '</span>';
  }
  function stripHtml(st, year) {
    if (!st) return pill('⏳ athuga stöðu ' + year + '…', 'hlutlaust');
    const parts = [];
    parts.push(st.skyrsla
      ? pill('📄 Úttektarskýrsla ' + year + ' — TIL' + (dmy(st.skyrsla.dags) ? ' (' + dmy(st.skyrsla.dags) + ')' : ''), 'gult')
      : pill('📄 Úttektarskýrsla ' + year + ' — vantar', 'hlutlaust'));
    if (st.reikningur) {
      const r = st.reikningur;
      const pd = (r.payday && r.payday.status) || '';
      const greitt = r.greitt || pd === 'PAID';
      const stada = greitt ? 'GREITT' + (dmy(r.greitt) ? ' ' + dmy(r.greitt) : '')
                  : (r.krafa_sent || pd === 'SENT') ? 'krafa send' + (dmy(r.krafa_sent) ? ' ' + dmy(r.krafa_sent) : '')
                  : 'krafa ekki send';
      parts.push(pill('🧾 Reikningur ' + year + ' — ' + esc(r.num) + ' · ' + kr(r.samtals) + ' · ' + stada,
                      greitt ? 'raudt' : 'gult'));
    } else {
      parts.push(pill('🧾 Reikningur ' + year + ' — enginn', 'hlutlaust'));
    }
    return parts.join(' ');
  }

  function paintStrip(coId, year) {
    const section = document.getElementById('_ctc-section');
    if (!section) return;
    const head = section.firstElementChild;                 // svarti REIKNINGUR-hausinn
    if (!head) return;
    let strip = section.querySelector('#_uv-strip');
    if (!strip) {
      strip = document.createElement('div');
      strip.id = '_uv-strip';
      strip.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap;align-items:center;' +
        'margin:-6px 0 12px;padding:0 2px';
      head.parentNode.insertBefore(strip, head.nextSibling);
    }
    strip.innerHTML = stripHtml(cached(coId, year), year);
  }

  /* Sama merking við „📄 Búa til úttektarskýrslu" (ósk Agnars: „líka merking að
     úttektarskýrslan sé til uppi hjá að útbúa nýja skýrslu"). */
  function paintReportBtn(coId, year) {
    const st = cached(coId, year); if (!st) return;
    document.querySelectorAll('#companies-main button').forEach(b => {
      const t = (b.textContent || '').trim();
      if (!/Búa til úttektarskýrslu|úttektarskýrslu/i.test(t)) return;
      if (b.querySelector('._uv-rb')) return;
      const tag = document.createElement('span');
      tag.className = '_uv-rb';
      tag.style.cssText = 'margin-left:8px;font-size:10px;font-weight:800;padding:2px 7px;border-radius:99px;' +
        (st.skyrsla ? 'background:#fde68a;color:#7c4a03' : 'background:rgba(255,255,255,.25);color:inherit');
      tag.textContent = st.skyrsla ? ('· ' + year + ' TIL') : ('· ' + year + ' vantar');
      b.appendChild(tag);
    });
  }

  /* ── LAG 2: blokkandi gluggi ─────────────────────────────────────────── */
  function confirmSecond(st, year) {
    return new Promise(resolve => {
      const r = st.reikningur;
      const greitt = !!(r.greitt || (r.payday && r.payday.status === 'PAID'));
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.62);' +
        'display:flex;align-items:center;justify-content:center;padding:18px';
      wrap.innerHTML =
        '<div style="background:#fff;border-radius:14px;max-width:560px;width:100%;padding:20px 22px;' +
        'box-shadow:0 30px 80px -20px rgba(0,0,0,.5);font:inherit">' +
          '<div style="font-size:17px;font-weight:800;color:#7f1d1d;margin-bottom:6px">' +
            '⚠ Reikningur ' + year + ' er ÞEGAR TIL</div>' +
          '<div style="font-size:13.5px;color:#334155;line-height:1.6;margin-bottom:14px">' +
            '<b>' + esc(r.num) + '</b> · ' + kr(r.samtals) + (dmy(r.dags) ? ' · ' + dmy(r.dags) : '') +
            (greitt ? '<br><b style="color:#7f1d1d">Þessi reikningur er GREIDDUR.</b>' : '') +
            '<br>Að búa til annan reikning þýðir að viðskiptavinurinn fær tvo reikninga fyrir sömu úttekt.' +
            (greitt ? ' Það hefur áður leitt til tvígreiðslu sem þurfti að endurgreiða.' : '') +
          '</div>' +
          '<label style="display:block;font-size:12px;font-weight:700;color:#64748b;margin-bottom:5px">' +
            'Til að búa til ANNAN reikning samt: skrifaðu NÝR og ástæðuna</label>' +
          '<input id="_uv-word" placeholder="NÝR" autocomplete="off" ' +
            'style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;margin-bottom:8px">' +
          '<input id="_uv-why" placeholder="Ástæða (skráist á reikninginn)" autocomplete="off" ' +
            'style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;margin-bottom:14px">' +
          '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">' +
            '<button id="_uv-cancel" style="padding:10px 18px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-weight:800">Hætta við</button>' +
            '<button id="_uv-open" style="padding:10px 16px;background:#fff;color:#334155;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-weight:700">Opna reikninginn</button>' +
            '<button id="_uv-go" disabled style="padding:10px 16px;background:#fecaca;color:#7f1d1d;border:none;border-radius:8px;cursor:not-allowed;font:inherit;font-weight:700;opacity:.6">Búa til annan reikning samt</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(wrap);
      const word = wrap.querySelector('#_uv-word');
      const why = wrap.querySelector('#_uv-why');
      const go = wrap.querySelector('#_uv-go');
      const sync = () => {
        const ok = word.value.trim().toUpperCase() === 'NÝR' && why.value.trim().length >= 3;
        go.disabled = !ok;
        go.style.cursor = ok ? 'pointer' : 'not-allowed';
        go.style.opacity = ok ? '1' : '.6';
        go.style.background = ok ? '#b91c1c' : '#fecaca';
        go.style.color = ok ? '#fff' : '#7f1d1d';
      };
      word.addEventListener('input', sync); why.addEventListener('input', sync);
      const done = v => { wrap.remove(); resolve(v); };
      wrap.querySelector('#_uv-cancel').addEventListener('click', () => done(null));
      wrap.querySelector('#_uv-open').addEventListener('click', () => {
        done(null);
        try { if (window.Sala && Sala.openByNum) Sala.openByNum(r.num); else location.hash = '#bokhald'; } catch (_) {}
      });
      go.addEventListener('click', () => { if (!go.disabled) done({ why: why.value.trim() }); });
      wrap.addEventListener('keydown', e => { if (e.key === 'Escape') done(null); });
      setTimeout(() => wrap.querySelector('#_uv-cancel').focus(), 30);
    });
  }

  // Capture-fasi svo við komum Á UNDAN smell-hlustara 165.
  document.addEventListener('click', async (e) => {
    const btn = e.target && e.target.closest && e.target.closest('#_vw-finish');
    if (!btn || btn.dataset.uvOk === '1') return;
    const coId = getCompanyId(); if (!coId) return;
    const year = new Date().getFullYear();
    e.preventDefault(); e.stopImmediatePropagation();
    const st = await statusFor(coId, year, true);
    paintStrip(coId, year);
    if (!st || !st.reikningur) {                 // ekkert til → leyfa venjulegt flæði
      btn.dataset.uvOk = '1';
      btn.click();
      delete btn.dataset.uvOk;
      return;
    }
    const res = await confirmSecond(st, year);
    if (!res) return;                             // Hætta við — sjálfgefið
    window.__uvSecondReason = res.why;            // 165 má skrá þetta ef það vill
    btn.dataset.uvOk = '1';
    btn.click();
    delete btn.dataset.uvOk;
  }, true);

  /* ── „Byrja á <næsta ári> skýrslunni" ────────────────────────────────── */
  function paintNextYearBtn(coId, year) {
    const st = cached(coId, year); if (!st || !st.reikningur) return;   // aðeins þegar árið er frágengið
    const bar = document.querySelector('#_ctc-section ._vw-bar');
    if (!bar || bar.querySelector('#_uv-next')) return;
    const nxt = year + 1;
    const b = document.createElement('button');
    b.id = '_uv-next';
    b.type = 'button';
    b.style.cssText = 'padding:10px 18px;background:#fff;color:#334155;border:1px solid #cbd5e1;' +
      'border-radius:8px;cursor:pointer;font:inherit;font-size:14px;font-weight:700';
    b.textContent = '🗓 Byrja á ' + nxt + ' skýrslunni';
    b.title = 'Núllstillir grænu hökin og valið fyrir nýtt ár. Reikningur ' + year + ' stendur óbreyttur.';
    b.addEventListener('click', async () => {
      const ok = window.Confirm && Confirm.show
        ? await Confirm.show('Byrja á ' + nxt + ' skýrslunni?\n\nGrænu hökin og þjónustuvalið núllstillast.\n' +
            'Reikningur ' + year + ' (' + st.reikningur.num + ') og skýrsla ársins standa ÓBREYTT.',
            { danger: true, okText: 'Byrja á ' + nxt })
        : confirm('Byrja á ' + nxt + ' skýrslunni? Grænu hökin núllstillast.');
      if (!ok) return;
      try {
        // Sama hreinsun og 165 gerði áður sjálfkrafa — nú AÐEINS að beiðni Agnars.
        const KEEP = ['skodunaradili', 'skodun_manudur', 'skodun_ym', 'skodun_dagsetning',
                      'invoice_text', 'notes'];
        let st0 = {};
        try { st0 = JSON.parse(localStorage.getItem('slokk_trip_' + coId) || '{}') || {}; } catch (_) {}
        const keep = {};
        KEEP.forEach(k => { if (st0[k]) keep[k] = st0[k]; });
        localStorage.setItem('slokk_trip_' + coId, JSON.stringify(Object.assign({
          units: null, extras: null, computed: null, discount_pct: null, drive: null,
          driveQty: null, skyrslugerd: null, line_disc: null, line_price: null,
          _locked: false, _doneIds: [], _invoice: null,
        }, keep)));
        localStorage.removeItem('sk_ut_done_' + coId);
        if (window.Toast && Toast.show) Toast.show('🗓 Byrjað á ' + nxt + ' — hökin núllstillt');
        if (window.Companies && Companies.openDetail) setTimeout(() => Companies.openDetail(coId), 150);
      } catch (err) {
        alert('Tókst ekki að núllstilla: ' + ((err && err.message) || err));
      }
    });
    bar.insertBefore(b, bar.firstChild);
  }

  /* ── Endurteikning: 129 teiknar hlutann upp á nýtt, við setjum okkar aftur ── */
  function tick() {
    const coId = getCompanyId(); if (!coId) return;
    const year = new Date().getFullYear();
    if (!cached(coId, year)) {
      statusFor(coId, year).then(() => { paintStrip(coId, year); paintReportBtn(coId, year); paintNextYearBtn(coId, year); });
      return;
    }
    paintStrip(coId, year); paintReportBtn(coId, year); paintNextYearBtn(coId, year);
  }
  const mo = new MutationObserver(() => { clearTimeout(mo._t); mo._t = setTimeout(tick, 120); });
  function boot() {
    const main = document.getElementById('companies-main');
    if (main) mo.observe(main, { childList: true, subtree: true });
    tick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('hashchange', () => setTimeout(boot, 200));

  window.UttektVorn = { statusFor, refresh: (coId, y) => statusFor(coId, y || new Date().getFullYear(), true) };
  console.log('[patch-328] úttektar-vörn tilbúin');
})();
