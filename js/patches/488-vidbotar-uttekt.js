/* === VIÐBÓTARÚTTEKT (488, 28.10.2026) ===
 *
 * Ósk Agnars 28.10.2026: bætist tæki við tækjalistann EFTIR að úttektarreikningur ársins er til á að birtast auka
 * samantektarkassi fyrir neðan þann venjulega (græna Heildarkostnað, patch 129) með spurningunni „Viltu gera
 * viðbótarúttekt?". Svarið er JÁ eða NEI — ekkert gerist sjálfkrafa.
 *
 *   NEI  -> tækin eru merkt „afgreidd" á þjóninum (vidbot_uttekt.<fyrirtæki>.dismissed) og kassinn hverfur.
 *           Þetta er sjálfgefið og ríma við regluna „aldrei rukka mismun eftir á": skráin er bara leiðrétt.
 *   JÁ   -> valmynd: ② rukka akstur aftur? ③ rukka skýrslugerð aftur? ④ samantekt. „Klára viðbótarúttekt" býr þá til
 *           (a) NÝJAN viðbótarreikning (solur, source 'uttekt') með AÐEINS nýju tækjunum, ósendan,
 *           (b) NÝJA aðalúttektarskýrslu með öllum tækjum (168 tekur við af þeirri fyrri, sjá window.CIR_VIDBOT).
 *           Báðar sendast saman úr Kröfuyfirliti: payday-push festir skýrslu ársins við kröfuna.
 *
 * Gildir aðeins ÁRIÐ Í ÁR og aðeins um tæki sem bættust við eftir síðasta úttektarreikning ársins
 * (uttaeki.created_at > solur.created_at). Verð nýju tækjanna eru lesin úr SÖMU töflu og reikningurinn
 * (patch 129, ritanlegt verð + afsláttur) — engin ný verðvél, engin tvítekin regla.
 *
 * Viðbótarreikningurinn ber krafa_note sem byrjar á „Viðbótarúttekt við R-…" (audit-vidbotaruttekt.cjs þekkir hann).
 */
(() => {
  if (window.__vidbotUttekt488) return;
  window.__vidbotUttekt488 = true;

  const BOX = '_vb-box';
  const KIND_VAL = { hledsla: 'Hleðsla', yfirferd: 'Yfirferð', nyitt: 'Nýtt', onytt: 'Ónýtt' };
  const NON = { onytt: 1, geymsla: 1, urelt: 1, i_vinnslu: 1 };
  const MARKI = 'Viðbótarúttekt við ';
  // Gildir aðeins um tæki sem bætast við EFTIR að þetta fór í loftið: 93 félög áttu tæki sem komu eftir reikning í sumar
  // (mælt 28.10 — leiðréttingar á tækjaskrá, ekki viðbætur) og spurningin átti ekki að dynja á þeim öllum í einu.
  const FRA = typeof window.VIDBOT_FRA === 'number' ? window.VIDBOT_FRA : Date.parse('2026-10-28T00:00:00');   // prófun má setja VIDBOT_FRA

  // Þekkir viðbótarreikning: forskeyti í krafa_note EÐA númerið á listanum (krafa_note er ritanlegt í Kröfu yfirliti, 166 _ky-note).
  // Notað af 166/175/199/226/253/311/328 svo viðbótin verði aldrei „reikningur ársins" í stað aðalreikningsins.
  function erVidbot(num, note) {
    if (/^Viðbótarúttekt við /.test(String(note || ''))) return true;
    try {
      const all = (window.AppSettings && AppSettings.path && AppSettings.path('vidbot_uttekt')) || {};
      for (const k in all) { const l = all[k] && all[k].sala_nums; if (Array.isArray(l) && l.indexOf(String(num)) >= 0) return true; }
    } catch (_) {}
    return false;
  }
  window.VidbotUttekt = Object.assign(window.VidbotUttekt || {}, { erVidbot });

  const ST = { coId: null, open: false, akstur: false, akQty: 1, akVerd: null, skyrsla: false, skVerd: null, busy: false, sig: '', manudur: null };
  let _cache = {};          // coId -> { at, data }
  let _bus = false, _aftur = false, _t = 0;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kr = n => new Intl.NumberFormat('is-IS').format(Math.round(n || 0)) + ' kr';
  const dagur = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); };
  const skra = (kind, detail) => { try { window.logProblem && window.logProblem(kind, detail); } catch (_) {} };
  const toast = t => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };

  // Sama coId-uppfletting og 165/271.
  function getCoId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const idEl = main.querySelector('[data-co-id]:not(._cat-section)');
    if (idEl) { const v = idEl.getAttribute('data-co-id'); if (v && /^\d+$/.test(v)) return +v; }
    const editBtn = main.querySelector('button._co-edit-anchor[onclick*="Companies.openEdit"]') ||
      main.querySelector('button[onclick*="Companies.openEdit"]');
    if (!editBtn) return null;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)/);
    return m ? +m[1] : null;
  }

  function loadTrip(coId) { try { return JSON.parse(localStorage.getItem('slokk_trip_' + coId) || '{}'); } catch (_) { return {}; } }

  // ── 1. Hvaða úttektarreikningar eru til í ár? ────────────────────────────────
  async function saekja(coId, ferskt) {
    const c = _cache[coId];
    if (!ferskt && c && Date.now() - c.at < 60000) return c.data;
    const sb = window.DB && DB.sb;
    if (!sb) return null;
    const ar = new Date().getFullYear();
    const r = await sb.from('solur')
      .select('id,num,created_at,samtals,status,krafa_note,is_credit,hidden,athugasemdir')
      .eq('customer_id', coId).eq('source', 'uttekt')
      .gte('created_at', ar + '-01-01T00:00:00').order('created_at', { ascending: false }).limit(30);
    if (r.error) throw r.error;
    const rows = (r.data || []).filter(s => s.status !== 'void' && !s.is_credit && !s.hidden);
    let data = null;
    if (rows.length) {
      const latest = rows[0];
      const rot = rows.slice().reverse().find(s => !String(s.krafa_note || '').startsWith(MARKI)) || rows[rows.length - 1];
      data = { latest, rot, t0: Math.max(new Date(latest.created_at).getTime(), FRA) };
    }
    _cache[coId] = { at: Date.now(), data };
    return data;
  }

  function afgreidd(coId) {
    try {
      const v = window.AppSettings && AppSettings.path && AppSettings.path('vidbot_uttekt.' + coId + '.dismissed');
      return Array.isArray(v) ? v.map(String) : [];
    } catch (_) { return []; }
  }

  function normSt(s) {
    if (window.Companies && Companies._normStatus) return Companies._normStatus(s);
    const c = String(s == null ? '' : s).toLowerCase();
    if (c === 'onytt' || c === 'ónýtt') return 'onytt';
    if (/geymsl/.test(c)) return 'geymsla';
    if (c === 'urelt' || c === 'úrelt') return 'urelt';
    if (/vinnsl/.test(c)) return 'i_vinnslu';
    return 'active';
  }

  // Tæki sem kerfið býr sjálft til við að samræma tækjaskrá að skýrslu (270: serial AER…, notes „Auto: samræmt…"; tools/generera-taeki-ur-skyrslu:
  // „Generað …"; SQL-leiðréttingar: „Stofnað … mál #…") eru leiðréttingar á skránni, ekki viðbætur — þau kveikja ekki spurninguna.
  function sjalfgert(u) {
    return /^AER/.test(String(u.serial || '')) || /^(Auto: samræmt|Generað\b|Stofnað\b.*mál #)/.test(String(u.notes || ''));
  }

  function nyTaeki(coId, t0) {
    const all = (window.DB && DB.cache && DB.cache.units) || [];
    const af = new Set(afgreidd(coId));
    return all.filter(u => u && Number(u.fyrirtaeki_id) === Number(coId) && !NON[normSt(u.status)] && !sjalfgert(u) &&
      u.created_at && new Date(u.created_at).getTime() > t0 && !af.has(String(u.id)));
  }

  // strict (í klara): brestur lokað og skráir — tæki á verkbeiðni eru rukkuð þar og mega ekki tvírukkast hér.
  async function utanVerkbeidna(units, strict) {
    if (!units.length) return units;
    if (!(window.VerkTenging && VerkTenging.ensure && VerkTenging.rukkadA)) {
      if (strict) { skra('vidbot_verkbeidna_brast', 'VerkTenging vantar'); return null; }
      return units;
    }
    try { await VerkTenging.ensure(units.map(u => u.id)); return units.filter(u => !VerkTenging.rukkadA(u.id)); }
    catch (e) {
      if (strict) { skra('vidbot_verkbeidna_brast', String((e && e.message) || e).slice(0, 100)); return null; }
      return units;
    }
  }

  // Beiðni nr (Colas o.fl.) er kúnnatexti sem 165 skrifar á aðalreikninginn — viðbótin fær sömu línu (ekki annar innri texti).
  function beidniNr(sala) {
    const m = /Beiðni nr:[^\n]*/.exec(String((sala && sala.athugasemdir) || ''));
    return m ? m[0].trim() : '';
  }

  function val(coId, u) {
    if (window.UnitServicePicker && UnitServicePicker.getChoice) return UnitServicePicker.getChoice(coId, u.id, u.type);
    const st = loadTrip(coId);
    return (st.units && st.units[u.id]) || 'yfirferd';
  }

  // ── 2. Verð úr töflu 129 (sama heimild og reikningurinn) ─────────────────────
  function lesaVerd(section) {
    const hreinn = (window.VisitWorkflowReikn && VisitWorkflowReikn.hreinnTexti) || (el => String(el.textContent || '').trim());
    const out = {};
    section.querySelectorAll('table tbody tr').forEach(tr => {
      const inp = tr.querySelector('._ctc-line-price');
      if (!inp || !inp.dataset.lk) return;
      const tds = tr.querySelectorAll('td');
      if (tds.length < 6) return;
      const sub = tds[0].querySelector('div');
      const nafn = sub ? hreinn(sub) : '';
      const head = tds[0].firstChild && tds[0].firstChild.textContent ? tds[0].firstChild.textContent.trim() : '';
      const unit = parseInt(String(inp.value).replace(/[^0-9]/g, ''), 10) || 0;
      const vsk = parseInt((tds[4].textContent || '').replace(/[^0-9]/g, ''), 10) || 24;
      const di = tr.querySelector('._ctc-line-disc');
      const disc = di ? Math.max(0, Math.min(100, parseFloat(String(di.value).replace(',', '.')) || 0)) : 0;
      const kind = (tds[2].textContent || '').trim();
      out[inp.dataset.lk] = { unit, vsk, disc, kind, nafn: nafn || head };
    });
    return out;
  }

  function reikna(coId, units, verd) {
    const norm = (window.CtcPricing && CtcPricing.normalizeTypeFamily) || (t => t);
    const linur = {};            // lykill -> { desc, qty, unit, vsk }
    const taeki = [];            // { u, val, lykill, vantar }
    units.forEach(u => {
      const v = val(coId, u);
      if (!KIND_VAL[v]) { taeki.push({ u, val: 'skip' }); return; }
      const t = norm(u.type), s = u.size || '';
      const kandidatar = ['svc|' + t + '|' + s + '|' + v, 'svc|' + t + '|' + s + '|reyk', 'svc|' + t + '|' + s + '|vara'];
      const lykill = kandidatar.find(k => verd[k]);
      if (!lykill) { taeki.push({ u, val: v, vantar: true }); return; }
      const r = verd[lykill];
      const billed = r.disc > 0 ? Math.round(r.unit * (1 - r.disc / 100)) : r.unit;
      if (!(r.unit > 0)) { taeki.push({ u, val: v, lykill, vantar: true }); return; }
      if (!linur[lykill]) linur[lykill] = { desc: (r.kind ? r.kind + ' · ' : '') + r.nafn + (r.disc > 0 ? ' · −' + r.disc + '% afsl.' : ''), qty: 0, unit: billed, vsk: r.vsk };
      linur[lykill].qty++;
      taeki.push({ u, val: v, lykill, verd: billed });
    });
    return { linur: Object.values(linur), taeki, vantar: taeki.some(x => x.vantar) };
  }

  function sjalfgildi(trip) {
    const D = window.SlokkVisitDefaults || { akstur: 3600, driveQty: 1, skyrslugerd: 5600 };
    return {
      akstur: trip.drive != null ? +trip.drive : D.akstur,
      skyrslugerd: trip.skyrslugerd != null ? +trip.skyrslugerd : D.skyrslugerd
    };
  }

  function allarLinur(coId, rk) {
    const trip = loadTrip(coId), d = sjalfgildi(trip);
    const l = rk.linur.map(x => ({ desc: x.desc, qty: x.qty, unit_price_ex_vat: x.unit, vsk_pct: x.vsk }));
    if (ST.skyrsla) { const p = ST.skVerd != null ? ST.skVerd : d.skyrslugerd; if (p > 0) l.push({ desc: 'Skýrslugerð', qty: 1, unit_price_ex_vat: p, vsk_pct: 24 }); }
    if (ST.akstur) { const p = ST.akVerd != null ? ST.akVerd : d.akstur; if (p > 0 && ST.akQty > 0) l.push({ desc: 'Akstur', qty: ST.akQty, unit_price_ex_vat: p, vsk_pct: 24 }); }
    const pct = window.CtcDiscount && CtcDiscount.effectivePct ? CtcDiscount.effectivePct(coId, trip) : (Number(trip.discount_pct) || 0);
    const tot = window.VisitWorkflowReikn.totalsFromLinur(l, pct);
    return { linur: l, tot, pct };
  }

  // ── 3. Útlit ─────────────────────────────────────────────────────────────────
  (function css() {
    if (document.getElementById('_vb-css')) return;
    const s = document.createElement('style');
    s.id = '_vb-css';
    s.textContent =
      '#_vb-box{order:11;grid-column:1/-1;margin:0 0 26px;padding:14px 18px 16px;background:var(--surface2);border:1px solid var(--brd);border-left:5px solid #b8860b;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.04)}' +
      '#_vb-box h4{margin:0 0 4px;font-size:14px;font-weight:800;color:var(--ink,#0f172a)}' +
      '#_vb-box .vb-sub{font-size:13px;color:var(--ink2,#475569);margin:0 0 10px}' +
      '#_vb-box .vb-wrap{overflow-x:auto}' +
      // div-grind, EKKI <table>: 131/75/170 skreyta hverja töflu með „Raðnúmer“-haus (gátreitir, Breyta, Umfylling, Minnó-reitur).
      '#_vb-box .vb-r{min-width:420px;display:grid;grid-template-columns:minmax(90px,1.1fr) minmax(110px,1.4fr) minmax(80px,.9fr) minmax(100px,.9fr);gap:8px;padding:6px 8px;border-bottom:1px solid var(--brd);font-size:13px;align-items:center}' +
      '#_vb-box .vb-r span{font-size:13px;font-weight:400}' +
      '#_vb-box .vb-h span{font-size:11px;color:#64748b;font-weight:700}' +
      '#_vb-box .vb-n{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#b8860b;color:#fff;font-size:12px;font-weight:800;margin-right:8px;flex:none}' +
      '#_vb-box .vb-step{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:12px 0 0;font-size:13px;font-weight:600}' +
      '#_vb-box .vb-step label{display:inline-flex;align-items:center;gap:6px;cursor:pointer;min-height:36px}' +
      '#_vb-box input[type=number]{width:80px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:5px;font:inherit;font-size:12px;text-align:right}' +
      '#_vb-box .vb-pill{display:inline-block;padding:1px 7px;border-radius:99px;font-size:11px;font-weight:700}' +
      '#_vb-box .vb-pill.ny{background:#fef3c7;color:#92400e}' +
      '#_vb-box .vb-pill.nytt{background:#f3e8ff;color:#6b21a8}' +
      '#_vb-box .vb-pill.sk{background:#f1f5f9;color:#64748b}' +
      '#_vb-box .vb-tot{margin-top:12px;padding:10px 12px;background:rgba(184,134,11,.08);border:1px solid rgba(184,134,11,.35);border-radius:8px;font-size:13px}' +
      '#_vb-box .vb-tot b{font-variant-numeric:tabular-nums}' +
      '#_vb-box .vb-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}' +
      '#_vb-box button{min-height:44px;padding:0 16px;border-radius:8px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;border:1px solid #94a3b8;background:var(--surface,#fff);color:var(--ink,#0f172a)}' +
      '#_vb-box button.vb-p{background:linear-gradient(180deg,#475569,#1e293b);border-color:#0f172a;color:#fff}' +
      '#_vb-box button[disabled]{opacity:.5;cursor:not-allowed}' +
      '#_vb-box .vb-aths{font-size:12px;color:#64748b;margin-top:8px}' +
      '#_vb-box .vb-var{color:#b91c1c;font-size:12px;font-weight:600;margin-top:6px}';
    document.head.appendChild(s);
  })();

  function fjarlaeg() { const b = document.getElementById(BOX); if (b) b.remove(); ST.sig = ''; }

  function teikna(coId, data, rk) {
    const section = document.getElementById('_ctc-section');
    if (!section || !section.parentNode) return;
    let b = document.getElementById(BOX);
    if (!b) { b = document.createElement('div'); b.id = BOX; }
    if (b.previousElementSibling !== section) section.parentNode.insertBefore(b, section.nextSibling);
    const n = rk.taeki.length;
    const trip = loadTrip(coId), d = sjalfgildi(trip);
    const rows = rk.taeki.map(x => {
      const u = x.u;
      const merki = x.val === 'skip' ? '<span class="vb-pill sk">Sleppt</span>'
        : '<span class="vb-pill ' + (x.val === 'nyitt' ? 'nytt' : 'ny') + '">' + esc(KIND_VAL[x.val]) + '</span>';
      const verd = x.val === 'skip' ? '—' : (x.vantar ? '<span style="color:#b91c1c">⚠ verð vantar</span>' : kr(x.verd));
      return '<div class="vb-r"><span>' + esc(u.serial || '#' + u.id) + '</span><span>' + esc(u.type || '') + (u.size ? ' / ' + esc(u.size) : '') + '</span><span>' + merki + '</span><span style="text-align:right;white-space:nowrap">' + verd + '</span></div>';
    }).join('');
    let h = '<h4>➕ ' + n + (n === 1 ? ' tæki' : ' tæki') + ' bættust við eftir reikning ' + esc(data.latest.num) + ' (' + esc(dagur(data.latest.created_at)) + ')</h4>' +
      '<p class="vb-sub">Þessi tæki eru á tækjalistanum en ekki á reikningnum. <b>Viltu gera viðbótarúttekt?</b> Svarirðu nei er skráin bara leiðrétt og ekkert er rukkað.</p>' +
      '<div class="vb-wrap"><div class="vb-r vb-h"><span>Auðkenni</span><span>Tæki</span><span>Þjónusta</span><span style="text-align:right">Verð án vsk</span></div>' + rows + '</div>' +
      '<div class="vb-aths">Þjónustuna og verðið breytir þú eins og venjulega — valið á tækinu (opnaðu listann 🔒 ef hann er læstur) og taflan hér fyrir ofan; þessi kassi fylgir þeim. Nýtt tæki er sjálfgefið „Yfirferð" — veldu „Nýtt" ef það er nýtt tæki. Græna taflan hér fyrir ofan telur þessi tæki líka.</div>';
    if (!ST.open) {
      h += '<div class="vb-btns"><button type="button" class="vb-p" data-vb="ja">Já, gera viðbótarúttekt</button>' +
        '<button type="button" data-vb="nei">Nei, bara leiðrétta skrána</button></div>';
    } else {
      h += '<div class="vb-step"><span class="vb-n">①</span>Ný tæki: ' + n + ' (taflan hér að ofan)</div>' +
        '<div class="vb-step"><span class="vb-n">②</span><label><input type="checkbox" data-vb="ak" ' + (ST.akstur ? 'checked' : '') + '> Rukka akstur aftur</label>' +
        '<span style="font-weight:400">× </span><input type="number" min="0" step="1" data-vb="akn" value="' + ST.akQty + '" ' + (ST.akstur ? '' : 'disabled') + '>' +
        '<span style="font-weight:400">á </span><input type="number" min="0" step="1" data-vb="akv" value="' + Math.round(ST.akVerd != null ? ST.akVerd : d.akstur) + '" ' + (ST.akstur ? '' : 'disabled') + '><span style="font-weight:400">kr án vsk</span></div>' +
        '<div class="vb-step"><span class="vb-n">③</span><label><input type="checkbox" data-vb="sk" ' + (ST.skyrsla ? 'checked' : '') + '> Rukka skýrslugerð aftur</label>' +
        '<input type="number" min="0" step="1" data-vb="skv" value="' + Math.round(ST.skVerd != null ? ST.skVerd : d.skyrslugerd) + '" ' + (ST.skyrsla ? '' : 'disabled') + '><span style="font-weight:400">kr án vsk</span></div>' +
        '<div class="vb-step"><span class="vb-n">④</span>Samantekt</div><div class="vb-tot" id="_vb-tot"></div>' +
        '<div class="vb-aths">Þegar þú klárar: viðbótarreikningur (<b>ósendur</b>, bara nýju tækin) og ný aðalúttektarskýrsla með öllum tækjum. Báðar sendast saman úr Kröfuyfirliti.</div>' +
        (rk.hopur ? '<div class="vb-var">⚠ Afsláttarhópur náðist ekki — endurhlaðaðu síðuna áður en þú klárar, annars fer viðbótin út á fullu verði.</div>' : '') +
        (rk.vantar ? '<div class="vb-var">⚠ Verð vantar á línu (eða tækið er skráð „ekki rukka" í verðtengingu) — lagaðu verðið í töflunni að ofan eða veldu „Sleppa" á tækinu áður en þú klárar.</div>' : '') +
        '<div class="vb-btns"><button type="button" class="vb-p" data-vb="klara" ' + (rk.vantar || rk.hopur || ST.busy ? 'disabled' : '') + '>' + (ST.busy ? '⏳ Bý til…' : '✓ Klára viðbótarúttekt') + '</button>' +
        '<button type="button" data-vb="hætta" ' + (ST.busy ? 'disabled' : '') + '>Hætta við</button></div>';
    }
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(b) : null;   // regla 23.09: skrun og fókus lifa teikningu
    b.innerHTML = h;
    if (aftur) aftur();
    b._rk = rk; b._data = data;
    samtolur(coId);
  }

  function samtolur(coId) {
    const b = document.getElementById(BOX), t = document.getElementById('_vb-tot');
    if (!b || !t || !b._rk) return;
    const a = allarLinur(coId, b._rk);
    const orig = Number(b._data.rot.samtals) || 0;
    t.innerHTML = 'Viðbótarreikningur: <b>' + kr(a.tot.subEx) + '</b> án vsk · vsk ' + kr(a.tot.vsk) + ' · <b>alls ' + kr(a.tot.total) + '</b>' +
      (a.pct > 0 ? ' <span style="color:#b91c1c">(−' + a.pct + '% afsláttur)</span>' : '') +
      '<br><span style="color:#64748b">Upprunalegur reikningur ' + esc(b._data.rot.num) + ' ' + kr(orig) + ' + viðbót ' + kr(a.tot.total) + ' = ' + kr(orig + a.tot.total) + '</span>';
  }

  // ── 4. Uppfærsla kassans ─────────────────────────────────────────────────────
  async function uppfaera() {
    if (_bus) { _aftur = true; return; }
    _bus = true;
    try {
      const coId = getCoId();
      const section = document.getElementById('_ctc-section');
      if (!coId || !section || !(window.VisitWorkflowReikn)) { fjarlaeg(); return; }
      if (ST.coId !== coId) { ST.coId = coId; ST.open = false; ST.akstur = false; ST.akQty = 1; ST.akVerd = null; ST.skyrsla = false; ST.skVerd = null; ST.busy = false; ST.sig = ''; }
      const data = await saekja(coId);
      if (getCoId() !== coId) return;
      if (!data) { fjarlaeg(); return; }
      let units = nyTaeki(coId, data.t0);
      units = await utanVerkbeidna(units);
      if (getCoId() !== coId) return;
      if (!units.length) { fjarlaeg(); return; }
      const verd = lesaVerd(section);
      const rk = reikna(coId, units, verd);
      rk.hopur = /Afsláttarhópur náðist ekki/.test(section.textContent || '');
      const sig = JSON.stringify([coId, data.latest.num, rk.taeki.map(x => [x.u.id, x.val, x.verd, x.vantar ? 1 : 0]), rk.hopur ? 1 : 0, ST.open, ST.busy, ST.akstur, ST.skyrsla]);
      const b = document.getElementById(BOX);
      if (b && sig === ST.sig && b.previousElementSibling === section) { b._rk = rk; b._data = data; samtolur(coId); return; }
      ST.sig = sig;
      teikna(coId, data, rk);
    } catch (e) {
      skra('vidbot_uppfaersla_brast', String((e && e.message) || e).slice(0, 150));
    } finally {
      _bus = false;
      if (_aftur) { _aftur = false; sidar(); }
    }
  }
  function sidar(ms) { clearTimeout(_t); _t = setTimeout(uppfaera, ms == null ? 350 : ms); }

  // ── 5. Aðgerðir ──────────────────────────────────────────────────────────────
  async function nei(coId) {
    const b = document.getElementById(BOX);
    if (!b || !b._rk) return;
    const ids = b._rk.taeki.map(x => String(x.u.id));
    try { await AppSettings.load(); } catch (_) {}   // annað tæki getur hafa afgreitt önnur tæki — merging á fylki skiptir því út
    const gamalt = afgreidd(coId);
    let ok = false;
    try { ok = await AppSettings.save({ vidbot_uttekt: { [String(coId)]: { dismissed: gamalt.concat(ids.filter(i => gamalt.indexOf(i) < 0)) } } }); }
    catch (e) { skra('vidbot_nei_brast', String((e && e.message) || e).slice(0, 120)); }
    if (ok !== true) { skra('vidbot_nei_brast', 'co ' + coId + ': vistun skilaði ekki true'); alert('Vistun mistókst — svarið skráðist ekki. Reyndu aftur.'); return; }
    toast('✓ Skráin leiðrétt — engin viðbótarúttekt');
    ST.sig = ''; fjarlaeg();
  }

  async function klara(coId) {
    const b = document.getElementById(BOX);
    if (!b || !b._rk || ST.busy) return;
    const sb = DB.sb;
    ST.busy = true; ST.sig = '';
    const haetta = async texti => { ST.busy = false; ST.sig = ''; if (texti) alert(texti); await uppfaera(); };
    await uppfaera();   // teiknar „Bý til…" og les verðin ferskt úr töflunni
    const bb = document.getElementById(BOX);
    const rk = bb && bb._rk, data0 = bb && bb._data;
    if (!rk || !data0) return haetta();
    if (rk.vantar || rk.hopur) return haetta('Verð vantar eða afsláttarhópur náðist ekki — lagaðu töfluna fyrst. Ekkert var búið til.');
    const serviced = rk.taeki.filter(x => KIND_VAL[x.val]);
    const a = allarLinur(coId, rk);
    if (!serviced.length || !a.linur.length) return haetta('Engin tæki með þjónustu valin — veldu Hleðsla, Yfirferð eða Nýtt á tækjunum.');
    if (!confirm('Búa til viðbótarreikning?\n\n' + serviced.length + ' ný tæki' + (ST.akstur ? ' + akstur' : '') + (ST.skyrsla ? ' + skýrslugerð' : '') +
      '\nAlls ' + kr(a.tot.total) + ' með vsk (ósendur — þú sendir úr Kröfuyfirliti).\n\nNý aðalúttektarskýrsla með öllum tækjum verður búin til og tekur við af þeirri fyrri; ' +
      'eldri úttektarskýrsla ársins (sem appið bjó til) verður fjarlægð. Krafan fer ekki út með gömlu skýrslunni.')) return haetta();

    // Ferskur lestur EFTIR staðfestingu (ekki áður en glugginn opnast): annað tæki getur hafa gert viðbótina, og tæki
    // geta hafa orðið úrelt/ónýt/færð á meðan glugginn var opinn. Allt sem víkur stöðvar — ekkert er rukkað af gamalli mynd.
    let data;
    try {
      try { await AppSettings.load(); } catch (_) {}   // afgreidd tæki frá öðru tæki
      data = await saekja(coId, true);
      if (!data || data.latest.num !== data0.latest.num) return haetta('Annar úttektarreikningur kom inn á meðan (' + (data ? data.latest.num : '—') + ') — opnaðu fyrirtækið aftur og athugaðu stöðuna. Ekkert var búið til.');
      const ids = serviced.map(x => x.u.id);
      const r = await sb.from('uttaeki').select('id,status,fyrirtaeki_id,created_at').in('id', ids);
      if (r.error) throw r.error;
      const lif = new Map((r.data || []).map(u => [u.id, u]));
      const brotid = ids.filter(id => { const u = lif.get(id); return !u || Number(u.fyrirtaeki_id) !== Number(coId) || NON[normSt(u.status)] || new Date(u.created_at).getTime() <= data.t0; });
      if (brotid.length) return haetta('Tækjalistinn breyttist á meðan (' + brotid.length + ' tæki eru ekki lengur ný/virk). Opnaðu fyrirtækið aftur. Ekkert var búið til.');
      const vt = await utanVerkbeidna(serviced.map(x => x.u), true);
      if (vt === null || vt.length !== ids.length) return haetta('Tæki á verkbeiðni eða staða verkbeiðna ófáanleg — þau eru rukkuð þar. Veldu „Sleppa" á þeim eða reyndu aftur. Ekkert var búið til.');
    } catch (e) {
      skra('vidbot_lestur_brast', 'co ' + coId + ': ' + String((e && e.message) || e).slice(0, 100));
      return haetta('Gat ekki lesið stöðuna: ' + (e.message || e) + '\nEkkert var búið til.');
    }

    // Skoðunarmánuðurinn ERFIST úr upprunalegu skýrslunni (facts) — hann má aldrei færast í „október" (regla Agnars). Lesinn FYRIR sölu:
    // finnist hann ekki (engin skýrsla ársins í facts) er spurt, í stað þess að 168 reikni hann hljóðlaust úr vélinni eða núverandi mánuði.
    let manudur = null;
    try {
      const f = await sb.from('arsskodun_report_facts').select('inspect_month,report_year').eq('fyrirtaeki_id', coId).maybeSingle();
      if (f.error) throw f.error;
      if (f.data && +f.data.report_year === new Date().getFullYear() && +f.data.inspect_month >= 1 && +f.data.inspect_month <= 12) manudur = +f.data.inspect_month;
    } catch (e) { skra('vidbot_manudur_brast', 'co ' + coId + ': ' + String((e && e.message) || e).slice(0, 100)); }
    if (manudur == null) {
      skra('vidbot_manudur_brast', 'co ' + coId + ': enginn skoðunarmánuður í facts');
      if (!confirm('Skoðunarmánuður upprunalegu skýrslunnar fannst ekki. Nýja skýrslan fær þá mánuðinn úr vélinni/núverandi mánuð (' + (new Date().getMonth() + 1) + '. mánuður) — hann á helst ekki að færast.\n\nHalda samt áfram?')) return haetta();
    }
    ST.manudur = manudur;
    const trip = loadTrip(coId);
    let kt = null, baseId = null, nafn = '';
    try {
      const cr = await sb.from('fyrirtaeki').select('nafn,kennitala,customer_base_id').eq('id', coId).maybeSingle();
      if (cr.error) throw cr.error;   // misheppnaður lestur má ekki gefa sölu án kennitölu/greiðanda
      if (cr.data) { kt = cr.data.kennitala || null; baseId = cr.data.customer_base_id || null; nafn = cr.data.nafn || ''; }
    } catch (e) {
      skra('vidbot_fyrirtaeki_lestur_brast', 'co ' + coId + ': ' + String((e && e.message) || e).slice(0, 100));
      return haetta('Gat ekki lesið fyrirtækið — viðbótarreikningur var ekki búinn til. Reyndu aftur.');
    }
    if (!nafn) { const h = document.querySelector('#companies-main h1, #companies-main h2'); nafn = h ? h.textContent.trim() : ''; }
    const taekiTexti = serviced.map(x => x.u.serial || ('#' + x.u.id)).join(', ').slice(0, 160);
    let sala = null;
    try {
      const ins = await sb.from('solur').insert({
        customer_nafn: nafn, customer_kt: kt, customer_id: coId, customer_base_id: baseId,
        starfsmadur: (trip.skodunaradili || '').trim() || 'Kassi',
        linur: a.linur, upphaed_an_vsk: a.tot.subEx, vsk_upphaed: a.tot.vsk, samtals: a.tot.total, afslattur: a.tot.afslattur,
        greitt_med: 'reikningur', source: 'uttekt', athugasemdir: beidniNr(data.rot),
        krafa_note: MARKI + data.rot.num + ' · ' + serviced.length + ' tæki bættust við eftir reikning ' + data.latest.num + ' (' + taekiTexti + ')'
      }).select('*').single();
      if (ins.error) throw ins.error;
      sala = ins.data;
    } catch (e) {
      skra('vidbot_sala_brast', 'co ' + coId + ': ' + String((e && e.message) || e).slice(0, 120));
      return haetta('Viðbótarreikningur vistaðist ekki: ' + (e.message || e) + '\n\nEkkert var breytt.');
    }
    // Merking sem notandinn nær ekki til: krafa_note er ritanlegur reitur í Kröfu yfirliti (166 _ky-note) og „Viðbótarúttekt við"
    // getur horfið þar. payday-push les þennan lista (vidbot_uttekt.<fyrirtæki>.sala_nums) og stöðvar viðbótarkröfu með gamla skýrslu.
    try {
      try { await AppSettings.load(); } catch (_) {}
      const gamlar = (AppSettings.path('vidbot_uttekt.' + coId + '.sala_nums') || []).map(String);
      const ok = await AppSettings.save({ vidbot_uttekt: { [String(coId)]: { sala_nums: gamlar.concat([String(sala.num)]) } } });
      if (ok !== true) throw new Error('save skilaði ekki true');
    } catch (e) {
      skra('vidbot_merking_brast', 'co ' + coId + ' ' + sala.num + ': ' + String((e && e.message) || e).slice(0, 100));
      alert('Viðbótarreikningur ' + sala.num + ' er búinn til en merkingin sem varnar því að hann fari út með gömlu skýrslunni vistaðist ekki. Sendu hann EKKI fyrr en nýja skýrslan er vistuð.');
    }
    // Skoðunardagsetning tækjanna (eins og 165: í dag, næsta eftir 12 mánuði).
    try {
      const nu = new Date(), dags = nu.getFullYear() + '-' + String(nu.getMonth() + 1).padStart(2, '0') + '-' + String(nu.getDate()).padStart(2, '0');
      const nx = new Date(nu.getFullYear() + 1, nu.getMonth(), nu.getDate());
      if (nx.getMonth() !== nu.getMonth()) nx.setDate(0);   // 29. feb → 28. feb
      const nesta = nx.getFullYear() + '-' + String(nx.getMonth() + 1).padStart(2, '0') + '-' + String(nx.getDate()).padStart(2, '0');
      const ids = serviced.map(x => x.u.id);
      const up = await sb.from('uttaeki').update({ last_insp: dags, next_insp: nesta }).in('id', ids);
      if (up.error) throw up.error;
      ((DB.cache && DB.cache.units) || []).forEach(u => { if (ids.indexOf(u.id) >= 0) { u.last_insp = dags; u.next_insp = nesta; } });
    } catch (e) { skra('vidbot_dagsetning_brast', 'co ' + coId + ' ' + sala.num + ': ' + String((e && e.message) || e).slice(0, 100)); toast('⚠ Skoðunardagsetningar tækjanna uppfærðust ekki'); }
    try { if (window.UttektInvoicePdf && UttektInvoicePdf.saveForSale) UttektInvoicePdf.saveForSale(coId, sala).catch(() => {}); } catch (_) {}
    // Ný aðalúttektarskýrsla (168 tekur við af þeirri fyrri) — og beðið eftir að hún sé raunverulega vistuð.
    window.CIR_VIDBOT = { coId, until: Date.now() + 15 * 60 * 1000, sala: sala.num, month: ST.manudur || null, year: new Date().getFullYear() };
    let opnadist = true;
    try { if (!window.CompanyInspectionReport) throw new Error('CompanyInspectionReport vantar'); await CompanyInspectionReport.open(coId); }
    catch (e) { opnadist = false; skra('vidbot_skyrsla_brast', 'co ' + coId + ' ' + sala.num + ': ' + String((e && e.message) || e).slice(0, 100)); opnaAftur(coId, sala, 'Skýrslan opnaðist ekki: ' + (e.message || e)); }
    toast('✓ Viðbótarreikningur ' + sala.num + ' búinn til (ósendur) — beðið eftir nýju skýrslunni');
    ST.busy = false; ST.open = false; ST.akstur = false; ST.skyrsla = false; ST.sig = '';
    delete _cache[coId];
    try { if (window.recomputeCompanyTotalCost) recomputeCompanyTotalCost(); } catch (_) {}
    sidar(800);
    if (opnadist) bidaSkyrslu(coId, sala);
  }

  // Bíður (án þess að læsa viðmótinu) eftir að ný úttektarskýrsla ársins sé vistuð EFTIR að salan varð til. Vistist hún ekki
  // á 45 sek. er það sagt berum orðum og skráð; payday-push stöðvar svo viðbótarkröfuna þar til skýrslan er til.
  // Býður að opna skýrsluna aftur (CIR_VIDBOT endurnýjað). Ekki vísað á „Skýrsla"-takkann í Heildarkostnaði: hann kallar á
  // advanceInspectionDates (129) sem færir næstu skoðun allra tækja sem eru ekki stimpluð í dag.
  function opnaAftur(coId, sala, astaeda) {
    if (confirm('Viðbótarreikningur ' + sala.num + ' er búinn til. ' + astaeda + '\n\nNý skýrsla verður að vera vistuð áður en krafan fer út (kerfið stöðvar hana annars).\n\nOpna skýrsluna núna?')) {
      window.CIR_VIDBOT = { coId, until: Date.now() + 15 * 60 * 1000, sala: sala.num, month: ST.manudur || (window.CIR_VIDBOT && window.CIR_VIDBOT.month) || null, year: new Date().getFullYear() };
      try { CompanyInspectionReport.open(coId); } catch (e) { skra('vidbot_skyrsla_brast', 'co ' + coId + ' ' + sala.num + ' (aftur): ' + String((e && e.message) || e).slice(0, 80)); }
      bidaSkyrslu(coId, sala);
    }
  }

  // T=S=I: eftir að nýja skýrslan er vistuð fylgir afrit tækjatalna (S) með, eins og eftir aðalúttekt (165 afritEftirUttekt;
  // equipment_manual virt). Skýrslan telur ÖLL tæki prófílsins, svo afritið gerir það líka.
  async function afritTolur(coId, sala) {
    try {
      if (!(window.VisitWorkflowReikn && VisitWorkflowReikn.afritEftirUttekt)) return;
      // Ferskur lestur (ekki DB.cache — hann getur verið gamalt ræsiafrit) og SAMA sía og T í audit-t-s-i/165: aðeins 'urelt' fellur út.
      // Brestur lesturinn er afritinu sleppt (S lækkar aldrei á gamalli mynd).
      const r = await DB.sb.from('uttaeki').select('id,type,size,status,fyrirtaeki_id').eq('fyrirtaeki_id', coId).range(0, 999);
      if (r.error) throw r.error;
      const all = (r.data || []).filter(u => String(u.status) !== 'urelt');
      if (!all.length || (r.data || []).length >= 1000) return;
      await VisitWorkflowReikn.afritEftirUttekt(coId, { units: all, servicedIds: all.map(u => u.id) }, sala.num);
    } catch (e) { skra('vidbot_afrit_brast', 'co ' + coId + ' ' + sala.num + ': ' + String((e && e.message) || e).slice(0, 100)); }
  }

  async function bidaSkyrslu(coId, sala) {
    const fra = (Date.parse(sala.created_at) || Date.now()) - 120000, ar = String(new Date().getFullYear());
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1500));
      let l = [];
      try { l = (window.CompanyAttachments && CompanyAttachments.list(coId)) || []; } catch (_) {}
      if (l.some(x => x && x.kind === 'skyrsla' && String(x.year) === ar && Date.parse(x.uploaded_at) >= fra && /úttektarskýrsla/i.test(String(x.name || '')))) {
        toast('✓ Ný úttektarskýrsla vistuð — viðbótarreikningur ' + sala.num + ' er tilbúinn í Kröfuyfirliti');
        afritTolur(coId, sala);
        return;
      }
    }
    skra('vidbot_skyrsla_vistun_brast', 'co ' + coId + ' ' + sala.num + ': ný skýrsla vistaðist ekki á 45 sek.');
    opnaAftur(coId, sala, 'Nýja skýrslan hefur EKKI vistast.');
  }

  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('#' + BOX + ' [data-vb]');
    if (!el) return;
    const coId = getCoId(), k = el.getAttribute('data-vb');
    if (!coId) return;
    if (k === 'ja') { ST.open = true; ST.sig = ''; uppfaera(); }
    else if (k === 'hætta') { ST.open = false; ST.sig = ''; uppfaera(); }
    else if (k === 'nei') { nei(coId); }
    else if (k === 'klara') { klara(coId); }
    else if (k === 'ak' || k === 'sk') {
      if (k === 'ak') ST.akstur = el.checked; else ST.skyrsla = el.checked;
      ST.sig = ''; uppfaera();
    }
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (!el || !el.closest || !el.closest('#' + BOX)) return;
    const k = el.getAttribute('data-vb'), v = Math.max(0, parseFloat(el.value) || 0);
    if (k === 'akn') ST.akQty = v; else if (k === 'akv') ST.akVerd = v; else if (k === 'skv') ST.skVerd = v; else return;
    const coId = getCoId(); if (coId) samtolur(coId);
  });

  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    new MutationObserver(muts => {
      if (muts.every(m => m.target && m.target.closest && m.target.closest('#' + BOX))) return;
      sidar();
    }).observe(main, { childList: true, subtree: true });
    document.addEventListener('input', e => { if (e.target && e.target.closest && e.target.closest('#_ctc-section')) sidar(600); });
    setInterval(() => { const v = document.getElementById('view-companies'); if (v && v.classList.contains('active')) sidar(0); }, 5000);
    sidar(1800);
  }
  attach();

  // Fyrir 328 („Klára heimsókn" eftir aðalreikning): hversu mörg ný tæki bíða og opna kassann í stað annars heils reiknings.
  async function bidur(coId) {
    try {
      const d = await saekja(coId);
      if (!d) return 0;
      const u = await utanVerkbeidna(nyTaeki(coId, d.t0));
      return u.length;
    } catch (_) { return 0; }
  }
  function opna(coId) {
    if (getCoId() !== coId) return;
    ST.open = true; ST.sig = '';
    uppfaera().then(() => { const b = document.getElementById(BOX); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  }
  Object.assign(window.VidbotUttekt, { uppfaera, saekja, nyTaeki, bidur, opna });
  console.log('[patch-488] viðbótarúttekt tilbúin');
})();
