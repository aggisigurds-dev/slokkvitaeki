/* === TEIKNING: DRAGA TÆKI OG STIMPLA (433) =================================
 *
 * Agnar 02.10.2026: FloorPlan á að virka eins og Turbopaint-lagið hjá
 * Bílabúð Benna — draga slökkvitæki af ræmunni á plönið, færa rauða
 * punktinn, og stimpla Neyðarútgang / Út / slöngumerki, rafmagnstöflu
 * og slökkvitækja-/slönguskilti. Merkin eru merki, ekki uttaeki-raðir.
 * Ekki EI-30/60 sem eldveggir — það eru veggja-ábendingar (434).
 *
 * Geymsla: sömu merki og rauðu punktarnir þegar nota (`teikning_bord`
 * per félag, `haedir[].markers` per hæð). Vista án þess að loka, svo
 * Loka/Vista og hæðaflipar halda sér.
 * ========================================================================== */
(() => {
  if (window.TeiknMerking) return;

  const TAFLA = 'teikning_bord';
  const STIMPLAR = [
    { id: 'neyðarútgangur', nafn: 'Neyðarútgangur', stutt: 'NÚ', litur: '#15803d', glyff: 'exit' },
    { id: 'ut', nafn: 'Út', stutt: 'ÚT', litur: '#15803d', glyff: 'exit' },
    { id: 'hose', nafn: 'Slöngumerki', stutt: 'SL', litur: '#c93c1d', glyff: 'hose' },
    { id: 'rafmagn', nafn: 'Rafmagnstafla', stutt: 'RAF', litur: '#eab308', glyff: 'electric' },
    { id: 'skilti_slt', nafn: 'Skilti slökkvitæki', stutt: 'SKL', litur: '#c93c1d', glyff: 'sign-extinguisher' },
    { id: 'skilti_slanga', nafn: 'Skilti brunaslanga', stutt: 'SLS', litur: '#c93c1d', glyff: 'sign-hose' }
  ];

  const S = { drag: null, bid: null, valinn: null, slepptSmellur: false, vistun: 0 };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FP = () => window.FloorPlan;
  const plan = () => {
    const F = FP(); if (!F || !F.companyId) return null;
    if (!F.plans[F.companyId]) F.plans[F.companyId] = { markers: [] };
    const p = F.plans[F.companyId];
    if (!Array.isArray(p.markers)) p.markers = [];
    return p;
  };
  const erStimpil = m => !!(m && (m.kind === 'sign' || (typeof m.unitId === 'string' && String(m.unitId).indexOf('s:') === 0)));
  const hamur = () => !!(window.TeiknBord && TeiknBord.hamur && TeiknBord.hamur());

  function strigaHnit(e) {
    const c = document.getElementById('fp-canvas');
    if (!c || !c.width) return null;
    const r = c.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    const x = (e.clientX - r.left) * (c.width / r.width);
    const y = (e.clientY - r.top) * (c.height / r.height);
    if (x < -8 || y < -8 || x > c.width + 8 || y > c.height + 8) return null;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function finnaMerki(e) {
    const c = document.getElementById('fp-canvas');
    const p = plan();
    if (!c || !p) return null;
    const r = c.getBoundingClientRect();
    let best = null, bd = 18;
    (p.markers || []).forEach(m => {
      const mx = (m.x > 1 || m.y > 1) ? m.x : m.x * c.width;
      const my = (m.x > 1 || m.y > 1) ? m.y : m.y * c.height;
      const sx = r.left + mx * (r.width / c.width);
      const sy = r.top + my * (r.height / c.height);
      const d = Math.hypot(e.clientX - sx, e.clientY - sy);
      if (d < bd) { bd = d; best = m; }
    });
    return best;
  }

  function endurteikna() {
    const F = FP();
    try { if (F && F._renderCanvas) F._renderCanvas(); } catch (_) {}
    try { if (F && F._renderPanel) F._renderPanel(); } catch (_) {}
    if (window.TeiknBord) {
      const Gteiknad = document.getElementById('fp-yfirlag');
      if (Gteiknad) Gteiknad._t433 = '';
    }
  }

  function setjaTaeki(unitId, x, y) {
    const p = plan(), F = FP();
    if (!p || unitId == null) return null;
    p.markers = p.markers.filter(m => m.unitId !== unitId);
    const m = { unitId, x, y };
    p.markers.push(m);
    if (F) F._selectedUnitId = unitId;
    try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
    endurteikna();
    return m;
  }

  function setjaStimpil(signId, x, y, unitId) {
    const p = plan();
    if (!p) return null;
    const def = STIMPLAR.find(s => s.id === signId) || STIMPLAR[1];
    const id = unitId || ('s:' + def.id + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    p.markers = p.markers.filter(m => m.unitId !== id);
    const m = { unitId: id, kind: 'sign', sign: def.id, x, y, color: def.litur };
    p.markers.push(m);
    try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
    endurteikna();
    return m;
  }

  function vistaAdThjoni() {
    try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
    const F = FP(); if (!F || !F.companyId) return;
    const cid = F.companyId, p = F.plans[cid]; if (!p) return;
    const hs = p.haedir;
    const sokn = window.TeiknBord && typeof TeiknBord.soknKom === 'function' ? TeiknBord.soknKom() : cid;
    // Ekki senda eina gervihæð áður en 375/383 les þjóninn — það myndi núlla 2. hæð.
    const haedirTilbunar = Array.isArray(hs) && hs.length && (sokn === cid || hs.length > 1);
    const fyrsta = haedirTilbunar ? hs[0] : null;
    const row = {
      company_id: cid,
      markers: (fyrsta && fyrsta.markers) ? fyrsta.markers : (p.markers || []),
      image_url: (fyrsta && typeof fyrsta.image_url === 'string' && fyrsta.image_url) || p.imageUrl || null,
      updated_at: new Date().toISOString()
    };
    if (haedirTilbunar) row.haedir = hs;
    try {
      localStorage.setItem('fp_' + cid, JSON.stringify({
        markers: row.markers, imageUrl: row.image_url, haedir: haedirTilbunar ? hs : undefined
      }));
    } catch (_) {}
    if (!window.DB || !DB.sb) return;
    const bid = ++S.vistun;
    DB.sb.from(TAFLA).upsert(row, { onConflict: 'company_id' }).then(function (r) {
      if (bid !== S.vistun) return;
      if (r && r.error) console.warn('[433] upsert', r.error.message);
    }, function (e) { console.warn('[433] upsert', e && e.message); });
  }

  function grip(e) {
    if (document.getElementById('fp-3d')) return false;
    if (hamur()) return false;
    if (!FP() || !FP().bgImage) return false;
    const hit = finnaMerki(e);
    if (!hit) return false;
    S.drag = { teg: 'faera', merki: hit, pointerId: e.pointerId };
    S.slepptSmellur = true;
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
    return true;
  }

  function iDragi() { return !!S.drag; }

  function faeraDrag(e) {
    if (S.bid && !S.drag) {
      if (Math.hypot(e.clientX - S.bid.x, e.clientY - S.bid.y) > 6) {
        S.drag = S.bid; S.bid = null;
        S.drag.x = e.clientX; S.drag.y = e.clientY;
        stillaDraug();
      }
      return;
    }
    if (!S.drag) return;
    if (S.drag.teg === 'faera' && S.drag.merki) {
      const p = strigaHnit(e);
      if (!p) return;
      S.drag.merki.x = p.x; S.drag.merki.y = p.y;
      try { FP()._renderCanvas(); } catch (_) {}
      return;
    }
    S.drag.x = e.clientX; S.drag.y = e.clientY;
    stillaDraug();
  }

  function lokaDrag(e) {
    const bid = S.bid; S.bid = null;
    const d = S.drag; S.drag = null;
    felaDraug();
    if (bid && !d) return;
    if (!d) return;
    S.slepptSmellur = true;
    const p = strigaHnit(e);
    if (d.teg === 'faera') {
      if (p && d.merki) { d.merki.x = p.x; d.merki.y = p.y; }
      try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
      endurteikna();
      vistaAdThjoni();
      return;
    }
    if (!p) { endurteikna(); return; }
    if (d.teg === 'taeki') setjaTaeki(d.unitId, p.x, p.y);
    else if (d.teg === 'stimpill') setjaStimpil(d.sign, p.x, p.y);
    vistaAdThjoni();
  }

  function draugur() {
    let g = document.getElementById('fp-draugur');
    if (!g) {
      g = document.createElement('div'); g.id = 'fp-draugur';
      g.style.cssText = 'position:fixed;z-index:80;pointer-events:none;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:7px;background:#c93c1d;color:#fff;font:700 10px system-ui,sans-serif;display:none;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.35);border:2px solid #fff';
      document.body.appendChild(g);
    }
    return g;
  }
  function stillaDraug() {
    if (!S.drag || S.drag.teg === 'faera') return;
    const g = draugur();
    g.style.display = 'flex';
    g.style.left = (S.drag.x || 0) + 'px';
    g.style.top = (S.drag.y || 0) + 'px';
    g.style.background = S.drag.teg === 'stimpill' ? (S.drag.litur || '#15803d') : '#c93c1d';
    g.textContent = S.drag.stutt || 'SLT';
  }
  function felaDraug() { const g = document.getElementById('fp-draugur'); if (g) g.style.display = 'none'; }

  function hefjaFraLista(e, teg, gogn) {
    if (e.button != null && e.button !== 0) return;
    S.bid = Object.assign({ teg, pointerId: e.pointerId, x: e.clientX, y: e.clientY }, gogn);
  }

  function stikaStimpla() {
    const panel = document.getElementById('fp-panel');
    if (!panel) return;
    let rod = document.getElementById('fp-stimpil');
    if (!rod) {
      rod = document.createElement('div'); rod.id = 'fp-stimpil';
      const listi = document.getElementById('fp-unit-list');
      if (listi && listi.parentNode === panel) panel.insertBefore(rod, listi);
      else panel.appendChild(rod);
    }
    const fingur = STIMPLAR.map(s => s.id).join(',') + ((window.TeiknTakn && TeiknTakn.fingrafar) ? TeiknTakn.fingrafar() : '');
    if (rod.dataset.ok === fingur && rod.querySelector('.fp-stimpill')) return;
    rod.dataset.ok = fingur;
    rod.innerHTML = '<div class="fp-stimpil-lbl">Merki</div>' + STIMPLAR.map(s =>
      '<button type="button" class="fp-stimpill" draggable="true" data-sign="' + s.id + '" title="' + esc(s.nafn) + ' — dragðu á teikninguna">' +
      '<span class="fp-stimpill-ico" style="background:' + s.litur + '"></span>' + esc(s.nafn) + '</button>'
    ).join('');
    rod.querySelectorAll('.fp-stimpill').forEach(b => {
      const id = b.getAttribute('data-sign');
      const def = STIMPLAR.find(s => s.id === id);
      const ico = b.querySelector('.fp-stimpill-ico');
      if (ico && window.TeiknTakn && TeiknTakn.teiknaISpan) TeiknTakn.teiknaISpan(ico, def);
      else if (ico) ico.textContent = def.stutt;
      b.addEventListener('pointerdown', e => {
        S.valinn = id;
        hefjaFraLista(e, 'stimpill', { sign: id, stutt: def.stutt, litur: def.litur });
      });
      b.addEventListener('dragstart', e => {
        S.bid = null; S.drag = null; felaDraug();
        e.dataTransfer.setData('application/x-fp-sign', id);
        e.dataTransfer.effectAllowed = 'copy';
      });
      b.addEventListener('click', e => {
        e.preventDefault();
        S.valinn = id;
        const info = document.getElementById('fp-info');
        if (info) info.textContent = 'Valið: ' + def.nafn + ' — dragðu eða smelltu á teikninguna';
      });
    });
  }

  function geraDraggandi() {
    const el = document.getElementById('fp-unit-list'), F = FP();
    if (!el || !F || !F.units) return;
    [...el.children].forEach((rod, i) => {
      const u = F.units[i]; if (!u || rod._t433) return;
      rod._t433 = 1;
      rod.draggable = true;
      rod.style.cursor = 'grab';
      rod.setAttribute('data-unit-id', String(u.id));
      rod.addEventListener('pointerdown', e => {
        if (e.target && e.target.closest && e.target.closest('button')) return;
        S.valinn = null;
        F._selectedUnitId = u.id;
        hefjaFraLista(e, 'taeki', { unitId: u.id, stutt: String(u.type || 'SLT').slice(0, 3).toUpperCase() });
      });
      rod.addEventListener('dragstart', e => {
        S.bid = null; S.drag = null; felaDraug();
        e.dataTransfer.setData('application/x-fp-unit', String(u.id));
        e.dataTransfer.effectAllowed = 'copyMove';
      });
    });
  }

  function tengjaDropp() {
    const main = document.getElementById('fp-main');
    if (!main || main._t433drop) return;
    main._t433drop = 1;
    main.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    main.addEventListener('drop', e => {
      e.preventDefault();
      const p = strigaHnit(e); if (!p) return;
      const uid = e.dataTransfer.getData('application/x-fp-unit');
      const sign = e.dataTransfer.getData('application/x-fp-sign');
      if (uid) setjaTaeki(isNaN(+uid) ? uid : +uid, p.x, p.y);
      else if (sign) setjaStimpil(sign, p.x, p.y);
      else return;
      vistaAdThjoni();
    });
  }

  function still() {
    if (document.getElementById('fp-merking-css')) return;
    const st = document.createElement('style'); st.id = 'fp-merking-css';
    st.textContent =
      '#fp-stimpil{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 10px;align-items:center}' +
      '#fp-stimpil .fp-stimpil-lbl{width:100%;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:2px}' +
      '#fp-stimpil .fp-stimpill{display:flex;align-items:center;gap:5px;padding:4px 6px 4px 4px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:rgba(255,255,255,.82);font:600 11px system-ui,sans-serif;cursor:grab}' +
      '#fp-stimpil .fp-stimpill span,#fp-stimpil .fp-stimpill-ico{display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:5px;color:#fff;font:700 8px system-ui,sans-serif;overflow:hidden;flex:none}' +
      '#fp-unit-list>div{cursor:grab}' +
      '#fp-canvas.fp-drop{outline:2px dashed rgba(201,60,29,.45);outline-offset:-2px}';
    document.head.appendChild(st);
  }

  function vefja() {
    const F = FP();
    if (!F || F.__merkingSkreytt) return !!F && !!F.__merkingSkreytt;
    if (typeof F.open !== 'function' || typeof F._renderPanel !== 'function') return false;
    const panel = F._renderPanel.bind(F);
    F._renderPanel = function () {
      panel();
      try { stikaStimpla(); geraDraggandi(); } catch (_) {}
    };
    if (typeof F.selectUnit === 'function' && !F.__merkingSelect) {
      const velja = F.selectUnit.bind(F);
      F.selectUnit = function (id) { S.valinn = null; return velja(id); };
      F.__merkingSelect = true;
    }
    const smell = F.onCanvasClick.bind(F);
    F.onCanvasClick = function (e) {
      if (S.slepptSmellur || S.drag) { S.slepptSmellur = false; return; }
      if (S.valinn && this.bgImage) {
        const p = strigaHnit(e);
        if (p) { setjaStimpil(S.valinn, p.x, p.y); vistaAdThjoni(); }
        return;
      }
      const uid = this._selectedUnitId;
      smell(e);
      try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
      if (uid) vistaAdThjoni();
    };
    const info = document.getElementById('fp-info');
    if (info && /Veldu tæki/i.test(info.textContent || '')) info.textContent = 'Dragðu tæki eða merki á teikninguna';
    F.__merkingSkreytt = true;
    return true;
  }

  function tikk() {
    const m = document.getElementById('modal-floorplan');
    if (!m || !m.isConnected) return;
    try { still(); } catch (_) {}
    try { vefja(); } catch (_) {}
    try { stikaStimpla(); } catch (_) {}
    try { geraDraggandi(); } catch (_) {}
    try { tengjaDropp(); } catch (_) {}
  }

  document.addEventListener('pointermove', e => { if (S.drag || S.bid) faeraDrag(e); }, true);
  document.addEventListener('pointerup', e => { if (S.drag || S.bid) lokaDrag(e); }, true);
  document.addEventListener('pointercancel', e => { if (S.drag || S.bid) lokaDrag(e); }, true);

  window.TeiknMerking = {
    grip, iDragi, setjaTaeki, setjaStimpil, vistaAdThjoni, erStimpil, stimplar: STIMPLAR, tikk
  };

  if (!vefja()) { let n = 0; const i = setInterval(() => { if (vefja() || ++n > 80) clearInterval(i); }, 150); }
  setInterval(() => { try { tikk(); } catch (_) {} }, 400);
  new MutationObserver(() => { try { tikk(); } catch (_) {} }).observe(document.documentElement, { childList: true, subtree: true });
})();
