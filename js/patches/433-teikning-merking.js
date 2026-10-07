/* === TEIKNING: DRAGA TÆKI OG STIMPLA (433) =================================
 *
 * Agnar 02.10.2026: FloorPlan á að virka eins og Turbopaint-lagið hjá
 * Bílabúð Benna — draga slökkvitæki af ræmunni á plönið, færa rauða
 * punktinn, og stimpla Neyðarútgang / Út / slöngumerki, rafmagnstöflu
 * og slökkvitækja-/slönguskilti. Merkin eru merki, ekki uttaeki-raðir.
 * Ekki EI-30/60 sem eldveggir — það eru veggja-ábendingar (434).
 *
 * Hægri smellur / löng ýting: valmynd á merkinu (Snúa, Afrita, Breyta í,
 * Eyða). Tómt blað: Setja merki. Tæki: Fjarlægja af teikningu, ekki eyða
 * tækinu úr fyrirtækinu. Ctrl+Z / Afturkalla tekur síðustu merki-aðgerð
 * til baka. Geymsla óbreytt (`teikning_bord` per félag).
 *
 * Agnar 02.10.2026: „get ekkert átt við þessar merkingar, breytt eða bætt
 * við". Native HTML5-dráttur á takkanum stal pointer-atburðum og pönnun
 * 383 át smelli á strigann. Smellur á merki í ræmu VELUR það (gull rammi)
 * og næsti smellur á teikninguna setur það niður. Smellur á merki á
 * teikningunni opnar Snúa/Afrita/Breyta/Eyða í ræmunni — ekki bara hægri
 * smell. Dráttur er pointer-capture, ekki HTML5.
 *
 * Agnar 02.10.2026: stærðarhvarfi (24–160 px) á BÆÐI tækjum og skiltum.
 * Sjálfgefið gildir á öll tákn; valið merki má hafa sína eigin. Stærðin
 * er í skjápunktum við 100% þysjun og fylgir zoominu — merki stækka ekki
 * þegar farið er út og minnka ekki þegar farið er inn.
 *
 * Agnar 02.10.2026: einn smellur á teikninguna setur EITT merki, velur það
 * (Eyða/Snúa/Breyta í ræmunni) og tekur vopnið af ræmunni. Næsti smellur
 * bætir ekki við öðrum Neyðarútgangi. Smelltu aftur á merki í ræmu til
 * að setja næsta. Yfirlagið velur efsta merkið þegar þau liggja ofan á
 * hvert öðru.
 * ========================================================================== */
(() => {
  if (window.TeiknMerking) return;

  const TAFLA = 'teikning_bord';
  const STAERD_LS = 'fp_stimpil_staerd';
  // 06.10.2026 (Agnar: „breyta stærðarstillunni svo ég geti minnkað meira“): lágmark 24 → 10 px.
  const STAERD_MIN = 10;
  const STAERD_MAX = 160;
  const STIMPLAR = [
    { id: 'neyðarútgangur', nafn: 'Neyðarútgangur', stutt: 'NÚ', litur: '#15803d', glyff: 'exit' },
    { id: 'ut', nafn: 'Út', stutt: 'ÚT', litur: '#15803d', glyff: 'exit' },
    { id: 'hose', nafn: 'Slöngumerki', stutt: 'SL', litur: '#c93c1d', glyff: 'hose' },
    { id: 'rafmagn', nafn: 'Rafmagnstafla', stutt: 'RAF', litur: '#eab308', glyff: 'electric' },
    { id: 'skilti_slt', nafn: 'Skilti slökkvitæki', stutt: 'SKL', litur: '#c93c1d', glyff: 'sign-extinguisher' },
    { id: 'skilti_slanga', nafn: 'Skilti brunaslanga', stutt: 'SLS', litur: '#c93c1d', glyff: 'sign-hose' },
    // Agnar 04.10.2026 (3D-sýnin): reykskynjari og viðvörunarbjalla — merki sem má setja þótt tækið sé ekki skráð.
    { id: 'reykskynjari', nafn: 'Reykskynjari', stutt: 'RS', litur: '#c93c1d', glyff: 'detector' },
    { id: 'hitaskynjari', nafn: 'Hitaskynjari', stutt: 'HS', litur: '#c93c1d', glyff: 'detector' },
    { id: 'bjalla', nafn: 'Viðvörunarbjalla', stutt: 'BJ', litur: '#c93c1d', glyff: 'alarm' },
    { id: 'segull', nafn: 'Segulloki', stutt: 'SG', litur: '#c93c1d', glyff: 'magnet' }
  ];
  const TAEKI_TAKN = [
    { id: 'lettvatn', nafn: 'Léttvatn', stutt: 'LÉ', litur: '#e11d2e', glyff: 'extinguisher' },
    { id: 'duft', nafn: 'Duft', stutt: 'DF', litur: '#e11d2e', glyff: 'extinguisher' },
    { id: 'co2', nafn: 'CO₂', stutt: 'CO', litur: '#e11d2e', glyff: 'extinguisher' },
    { id: 'slanga', nafn: 'Slanga', stutt: 'SL', litur: '#c93c1d', glyff: 'hose' }
  ];

  const S = {
    drag: null, bid: null, valinn: null, slepptSmellur: false, vistun: 0,
    valinnMerki: null, lp: 0, undo: [], undoLyk: '', valmynd: null, stadsetja: null
  };

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
  // „Nýtt"-merki (TurboPaint, Agnar 07.10.2026): tæki sem á eftir að skrá á félagið — TILLAGA sem bíður samþykkis eiganda.
  // { unitId: 'n:<lykill>:<id>', x, y, nytt: true, tegund: 'Léttvatn', stada: 'bid' }. ALDREI skráð tæki (ekkert uttaeki):
  // telst hvorki með tækjum né í talningu þeirra. TurboPaint tengir það sjálfkrafa við skráð tæki þegar þau koma.
  const erNytt = m => !!(m && (m.nytt === true || (typeof m.unitId === 'string' && String(m.unitId).indexOf('n:') === 0)));
  const hamur = () => !!(window.TeiknBord && TeiknBord.hamur && TeiknBord.hamur());
  const segja = t => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };

  function strigaHnit(e) {
    // Vinnumyndin (445) liggur yfir striganum: þá er staðurinn lesinn af HENNI (afvarpað á gólf eða vegg) og skilað í
    // sömu hnitum og hér — svo dráttur af ræmunni, valmyndin og stimplar setja merkið á sama hátt og í 2D.
    if (window.TeiknVinnumynd && TeiknVinnumynd.hnit) { const v = TeiknVinnumynd.hnit(e); if (v !== undefined) return v; }
    const c = document.getElementById('fp-canvas');
    if (!c || !c.width) return null;
    const r = c.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    const x = (e.clientX - r.left) * (c.width / r.width);
    const y = (e.clientY - r.top) * (c.height / r.height);
    if (x < -8 || y < -8 || x > c.width + 8 || y > c.height + 8) return null;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function klemmaStaerd(n) {
    const v = Math.round(Number(n));
    if (!v || !isFinite(v)) return 0;
    return Math.max(STAERD_MIN, Math.min(STAERD_MAX, v));
  }
  function autoStaerd(crW) {
    if (window.TeiknSja && TeiknSja.stimpilPx) return TeiknSja.stimpilPx(crW);
    const w = Number(crW) || 0;
    return Math.max(32, Math.min(56, Math.round(w / 12) || 32));
  }
  function thysjun() {
    const z = window.TeiknBord && typeof TeiknBord.thysjun === 'function' ? TeiknBord.thysjun() : 1;
    return (z > 0 && isFinite(z)) ? z : 1;
  }
  function passaBreidd(crW) {
    const c = document.getElementById('fp-canvas');
    const w = crW != null ? Number(crW) : (c && c.getBoundingClientRect().width) || 0;
    return w / thysjun();
  }
  function sjalfStaerd(crW) {
    const p = plan();
    const fraPlan = p && klemmaStaerd(p.stimpilStaerd);
    if (fraPlan) return fraPlan;
    const hs = p && p.haedir;
    const v = window.TeiknBord && typeof TeiknBord.virk === 'function' ? TeiknBord.virk() : 0;
    const fraHaed = hs && hs[v] && klemmaStaerd(hs[v].stimpilStaerd);
    if (fraHaed) return fraHaed;
    try {
      const ls = klemmaStaerd(localStorage.getItem(STAERD_LS));
      if (ls) return ls;
    } catch (_) {}
    return autoStaerd(crW);
  }
  function merkiStaerd(m, crW) {
    const eigin = m && klemmaStaerd(m.staerd);
    if (eigin) return eigin;
    return sjalfStaerd(passaBreidd(crW));
  }
  function skjaStaerd(m, crW) {
    return merkiStaerd(m, crW) * thysjun();
  }
  function gripPx(m, crW) {
    return skjaStaerd(m, crW) / 2 + 8;
  }

  function finnaMerki(e) {
    const c = document.getElementById('fp-canvas');
    const p = plan();
    if (!c || !p) return null;
    const r = c.getBoundingClientRect();
    let best = null, bd = 1e9;
    (p.markers || []).forEach(m => {
      const mx = (m.x > 1 || m.y > 1) ? m.x : m.x * c.width;
      const my = (m.x > 1 || m.y > 1) ? m.y : m.y * c.height;
      const sx = r.left + mx * (r.width / c.width);
      const sy = r.top + my * (r.height / c.height);
      const d = Math.hypot(e.clientX - sx, e.clientY - sy);
      const hit = gripPx(m, r.width);
      if (d <= hit && d <= bd) { bd = d; best = m; } // jafn fjarlægð: síðasta (efsta) merkið vinnur
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
    stikaValid();
  }

  function afritMerki(m) {
    if (!m) return null;
    // ALLIR reitir merkisins fylgja (Nýtt: nytt / tegund / stada; reitir frá TurboPaint). Áður voru aðeins þekktir reitir
    // afritaðir, svo „Afturkalla" eftir eyðingu skilaði Nýtt-merki án nytt/tegund — það varð þá óþekkt tæki.
    return Object.assign({}, m, { rot: m.rot || 0 });
  }
  function undoLykill() {
    const F = FP();
    const v = window.TeiknBord && typeof TeiknBord.virk === 'function' ? TeiknBord.virk() : 0;
    return (F && F.companyId) + ':' + v;
  }
  function hreinsaUndoEfSkipti() {
    const l = undoLykill();
    if (S.undoLyk !== l) { S.undo = []; S.undoLyk = l; }
  }
  function skraUndo(ath) {
    hreinsaUndoEfSkipti();
    S.undo.push(ath);
    if (S.undo.length > 24) S.undo.shift();
    afturkallaTakki();
  }
  function afturkalla() {
    hreinsaUndoEfSkipti();
    const a = S.undo.pop();
    if (!a) return false;
    const p = plan();
    if (!p) return false;
    if (a.teg === 'stimpill' && a.merki) {
      p.markers = (p.markers || []).filter(m => m.unitId !== a.merki.unitId);
    } else if (a.teg === 'taeki') {
      p.markers = (p.markers || []).filter(m => m.unitId !== a.unitId);
      if (a.old) p.markers.push(a.old);
    } else if (a.teg === 'faera' && a.merki) {
      const m = (p.markers || []).find(x => x.unitId === a.merki.unitId);
      if (m) { m.x = a.fraX; m.y = a.fraY; }
    } else if (a.teg === 'eyda' && a.merki) {
      p.markers.push(a.merki);
    } else if (a.teg === 'snua' && a.merki) {
      const m = (p.markers || []).find(x => x.unitId === a.merki.unitId);
      if (m) m.rot = a.fra;
    } else if (a.teg === 'breyta' && a.merki) {
      const m = (p.markers || []).find(x => x.unitId === a.merki.unitId);
      if (m) { m.sign = a.fraSign; m.color = a.fraLitur; if ('fraTakn' in a) { if (a.fraTakn) m.takn = a.fraTakn; else delete m.takn; } }
    } else if (a.teg === 'takn' && a.merki) {
      const m = (p.markers || []).find(x => x.unitId === a.merki.unitId);
      if (m) { if (a.fra) m.takn = a.fra; else delete m.takn; }
    } else if (a.teg === 'staerd') {
      if (a.merki) {
        const m = (p.markers || []).find(x => x.unitId === a.merki.unitId);
        if (m) { if (a.fra) m.staerd = a.fra; else delete m.staerd; }
      } else {
        p.stimpilStaerd = a.fra;
        const hs = p.haedir, v = window.TeiknBord && typeof TeiknBord.virk === 'function' ? TeiknBord.virk() : 0;
        if (hs && hs[v]) hs[v].stimpilStaerd = a.fra;
      }
    }
    try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
    endurteikna();
    vistaAdThjoni();
    afturkallaTakki();
    return true;
  }
  function afturkallaTakki() {
    const m = document.getElementById('modal-floorplan');
    if (!m) return;
    hreinsaUndoEfSkipti();
    let b = document.getElementById('fp-afturkalla');
    if (!S.undo.length) { if (b) b.hidden = true; return; }
    if (!b) {
      const grp = m.querySelector('.fp-hd-grp') || m.querySelector('.modal-hd > div:last-child');
      if (!grp) return;
      b = document.createElement('button');
      b.type = 'button'; b.id = 'fp-afturkalla';
      b.textContent = 'Afturkalla';
      b.title = 'Taka síðustu merki-aðgerð til baka (Ctrl+Z)';
      b.addEventListener('click', e => { e.preventDefault(); afturkalla(); });
      const gaedi = document.getElementById('fp-gaedi');
      try { grp.insertBefore(b, gaedi && gaedi.nextSibling ? gaedi.nextSibling : grp.firstChild); }
      catch (_) { grp.appendChild(b); }
    }
    b.hidden = false;
  }

  function nafnMerkis(m) {
    if (!m) return 'Merki';
    if (erNytt(m)) return 'Nýtt · ' + (m.tegund || 'tæki') + ' (í bið — bíður samþykkis eiganda)';
    if (erStimpil(m)) {
      const def = STIMPLAR.find(s => s.id === m.sign);
      return (def && def.nafn) || 'Merki';
    }
    const taknDef = m.takn && (TAEKI_TAKN.find(s => s.id === m.takn) || STIMPLAR.find(s => s.id === m.takn));
    const F = FP();
    const u = F && F.units && F.units.find(q => q && q.id === m.unitId);
    const grunn = u ? (String(u.type || 'Tæki') + (u.serial ? ' · ' + u.serial : '')) : 'Tæki';
    return taknDef ? (grunn + ' · ' + taknDef.nafn) : grunn;
  }

  function setjaTaeki(unitId, x, y) {
    const p = plan(), F = FP();
    if (!p || unitId == null) return null;
    const old = (p.markers || []).find(m => m.unitId === unitId);
    skraUndo({ teg: 'taeki', unitId, old: afritMerki(old) });
    p.markers = p.markers.filter(m => m.unitId !== unitId);
    const m = { unitId, x, y };
    p.markers.push(m);
    if (F) F._selectedUnitId = unitId;
    try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
    endurteikna();
    return m;
  }

  function setjaStimpil(signId, x, y, unitId, rot) {
    const p = plan();
    if (!p) return null;
    const def = STIMPLAR.find(s => s.id === signId) || STIMPLAR[1];
    const id = unitId || ('s:' + def.id + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    p.markers = p.markers.filter(m => m.unitId !== id);
    const m = { unitId: id, kind: 'sign', sign: def.id, x, y, color: def.litur, rot: rot || 0 };
    p.markers.push(m);
    skraUndo({ teg: 'stimpill', merki: afritMerki(m) });
    try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
    endurteikna();
    return m;
  }

  function setjaEitt(signId, x, y) {
    const m = setjaStimpil(signId, x, y);
    S.valinn = null;
    S.valinnMerki = m;
    stikaValid();
    return m;
  }

  function eydaMerki(m) {
    const p = plan();
    if (!p || !m) return false;
    skraUndo({ teg: 'eyda', merki: afritMerki(m) });
    p.markers = p.markers.filter(x => x !== m && x.unitId !== m.unitId);
    if (S.valinnMerki && S.valinnMerki.unitId === m.unitId) S.valinnMerki = null;
    try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
    endurteikna();
    vistaAdThjoni();
    lokaValmynd();
    segja(erStimpil(m) ? (nafnMerkis(m) + ' eytt — Afturkalla til að fá aftur') : 'Tæki fjarlægt af teikningunni');
    return true;
  }

  function snuaMerki(m) {
    if (!m) return false;
    const fra = m.rot || 0;
    m.rot = (fra + 90) % 360;
    skraUndo({ teg: 'snua', merki: afritMerki(m), fra });
    try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
    endurteikna();
    vistaAdThjoni();
    return true;
  }

  function afritaMerki(m) {
    if (!m || !erStimpil(m)) return null;
    const c = document.getElementById('fp-canvas');
    const r = c ? c.getBoundingClientRect() : { width: 200 };
    const hopp = Math.round(merkiStaerd(m, r.width) * ((c && c.width && r.width) ? (c.width / r.width) : 1) * 1.15);
    const ny = setjaStimpil(m.sign, Math.round(m.x) + hopp, Math.round(m.y) + hopp, null, m.rot || 0);
    if (ny && m.staerd) ny.staerd = m.staerd;
    return ny;
  }

  function breytaStimpil(m, signId) {
    if (!m || !erStimpil(m)) return false;
    const def = STIMPLAR.find(s => s.id === signId);
    if (!def || m.sign === def.id) return false;
    skraUndo({ teg: 'breyta', merki: afritMerki(m), fraSign: m.sign, fraLitur: m.color });
    m.sign = def.id; m.color = def.litur;
    try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
    endurteikna();
    vistaAdThjoni();
    return true;
  }
  function breytaTakn(m, lyk) {
    if (!m || erStimpil(m) || !lyk) return false;
    const def = TAEKI_TAKN.find(s => s.id === lyk) || STIMPLAR.find(s => s.id === lyk);
    if (!def) return false;
    const fra = m.takn || '';
    if (fra === def.id) return false;
    skraUndo({ teg: 'takn', merki: afritMerki(m), fra });
    m.takn = def.id;
    if (def.litur) m.color = def.litur;
    try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
    endurteikna();
    vistaAdThjoni();
    return true;
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
    if (p.stimpilStaerd) {
      const n = klemmaStaerd(p.stimpilStaerd);
      if (haedirTilbunar) hs.forEach(h => { h.stimpilStaerd = n; });
    }
    if (haedirTilbunar) row.haedir = hs;
    try {
      localStorage.setItem('fp_' + cid, JSON.stringify({
        markers: row.markers, imageUrl: row.image_url, haedir: haedirTilbunar ? hs : undefined
      }));
    } catch (_) {}
    if (!window.DB || !DB.sb) return;
    const bid = ++S.vistun;
    // 05.10.2026: um TeiknVistun.skrifa (375) — röðin er lesin fersk og SAMEINUÐ hafi önnur vél skrifað á meðan, í stað
    // þess að þessi vafri skrifi allar hæðir og skurði yfir úr minni. Beina leiðin stendur aðeins ef 375 vantar.
    const skrif = window.TeiknVistun && TeiknVistun.skrifa
      ? TeiknVistun.skrifa(cid, row)
      : DB.sb.from(TAFLA).upsert(row, { onConflict: 'company_id' }).then(r => ({ error: r && r.error }), e => ({ error: e }));
    skrif.then(function (r) {
      if (bid !== S.vistun) return;
      if (r && r.error) console.warn('[433] upsert', r.error.message || r.error);
    });
  }

  function lokaValmynd() {
    if (S.valmynd) { try { S.valmynd.remove(); } catch (_) {} S.valmynd = null; }
  }

  function setjaValmyndStad(el, x, y) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const pw = el.offsetWidth || 220, ph = el.offsetHeight || 180;
    el.style.left = Math.round(Math.min(vw - pw - 8, Math.max(8, x))) + 'px';
    el.style.top = Math.round(Math.min(vh - ph - 8, Math.max(8, y))) + 'px';
  }

  function stimpilRod(virkur, dataAct) {
    return '<div class="fp-vm-stimp">' + STIMPLAR.map(s =>
      '<button type="button" class="fp-vm-ico' + (virkur === s.id ? ' on' : '') + '" data-act="' + dataAct + '" data-sign="' + s.id + '" title="' + esc(s.nafn) + '"></button>'
    ).join('') + '</div>';
  }
  function taknRod(virkur) {
    return '<div class="fp-vm-stimp">' + TAEKI_TAKN.concat(STIMPLAR).map(s =>
      '<button type="button" class="fp-vm-ico' + (virkur === s.id ? ' on' : '') + '" data-act="takn" data-takn="' + s.id + '" title="' + esc(s.nafn) + '"></button>'
    ).join('') + '</div>';
  }

  function malaValmyndIkon(el) {
    el.querySelectorAll('.fp-vm-ico').forEach(b => {
      const id = b.getAttribute('data-takn') || b.getAttribute('data-sign');
      const def = STIMPLAR.find(s => s.id === id) || TAEKI_TAKN.find(s => s.id === id);
      if (!def) return;
      if (window.TeiknTakn && TeiknTakn.teiknaISpan) TeiknTakn.teiknaISpan(b, def);
      else { b.style.background = def.litur; b.textContent = def.stutt; }
    });
  }

  function malaValmynd(el, ham, merki) {
    if (ham === 'breyta' && merki) {
      el.innerHTML =
        '<div class="fp-vm-h">Breyta í</div>' +
        '<button type="button" class="fp-vm-li" data-act="heim">Til baka</button>' +
        (erStimpil(merki) ? stimpilRod(merki.sign, 'skipta') : taknRod(merki.takn || ''));
      malaValmyndIkon(el);
      return;
    }
    if (merki && erStimpil(merki)) {
      el.innerHTML =
        '<div class="fp-vm-h">' + esc(nafnMerkis(merki)) + '</div>' +
        '<button type="button" class="fp-vm-li" data-act="snua">Snúa ör / merki</button>' +
        '<button type="button" class="fp-vm-li" data-act="afrita">Afrita</button>' +
        '<button type="button" class="fp-vm-li" data-act="breyta">Breyta í…</button>' +
        '<div class="fp-vm-div"></div>' +
        '<button type="button" class="fp-vm-li fp-vm-hætta" data-act="eyda">Eyða</button>';
      return;
    }
    if (merki) {
      el.innerHTML =
        '<div class="fp-vm-h">' + esc(nafnMerkis(merki)) + '</div>' +
        '<button type="button" class="fp-vm-li" data-act="snua">Snúa tákn</button>' +
        '<button type="button" class="fp-vm-li" data-act="breyta">Breyta í…</button>' +
        '<div class="fp-vm-div"></div>' +
        '<button type="button" class="fp-vm-li fp-vm-hætta" data-act="eyda">Fjarlægja af teikningu</button>';
      return;
    }
    el.innerHTML =
      '<div class="fp-vm-h">Setja merki</div>' +
      stimpilRod('', 'setja');
    malaValmyndIkon(el);
  }

  function keyraValmynd(act, sign, merki, stad) {
    if (act === 'heim') { malaValmynd(S.valmynd, 'merki', merki); setjaValmyndStad(S.valmynd, stad.x, stad.y); return; }
    if (act === 'breyta') { malaValmynd(S.valmynd, 'breyta', merki); setjaValmyndStad(S.valmynd, stad.x, stad.y); return; }
    if (act === 'snua' && merki) { snuaMerki(merki); lokaValmynd(); return; }
    if (act === 'afrita' && merki) {
      const ny = afritaMerki(merki);
      if (ny) { vistaAdThjoni(); segja(nafnMerkis(ny) + ' afritað'); }
      lokaValmynd();
      return;
    }
    if (act === 'eyda' && merki) { eydaMerki(merki); return; }
    if (act === 'skipta' && merki && sign) { breytaStimpil(merki, sign); lokaValmynd(); return; }
    if (act === 'takn' && merki && sign) { breytaTakn(merki, sign); lokaValmynd(); return; }
    if (act === 'setja' && sign && stad.hnit) {
      setjaEitt(sign, stad.hnit.x, stad.hnit.y);
      vistaAdThjoni();
      lokaValmynd();
    }
  }

  function opnaValmynd(e, merki) {
    const modal = document.getElementById('modal-floorplan');
    if (!modal || !modal.isConnected) return;
    if (document.getElementById('fp-3d')) return;
    lokaValmynd();
    S.valinnMerki = merki || null;
    S.slepptSmellur = true;
    const el = document.createElement('div');
    el.id = 'fp-valmynd';
    el.setAttribute('role', 'menu');
    const stad = { x: e.clientX, y: e.clientY, hnit: strigaHnit(e) };
    malaValmynd(el, merki ? 'merki' : 'tomt', merki);
    document.body.appendChild(el);
    S.valmynd = el;
    setjaValmyndStad(el, stad.x, stad.y);
    el.addEventListener('pointerdown', ev => ev.stopPropagation());
    el.addEventListener('click', ev => {
      const b = ev.target.closest('[data-act]');
      if (!b) return;
      ev.preventDefault();
      keyraValmynd(b.getAttribute('data-act'), b.getAttribute('data-sign') || b.getAttribute('data-takn'), merki, stad);
    });
  }

  function grip(e) {
    if (document.getElementById('fp-3d')) return false;
    if (hamur()) return false;
    if (!FP() || !FP().bgImage) return false;
    const hit = finnaMerki(e);
    if (e.button === 2) {
      if (hit) S.valinnMerki = hit;
      return !!hit;
    }
    if (hit) {
      S.valinnMerki = hit;
      S.valinn = null;
      S.stadsetja = null;
      S.drag = { teg: 'faera', merki: hit, pointerId: e.pointerId, fraX: hit.x, fraY: hit.y, x0: e.clientX, y0: e.clientY };
      S.slepptSmellur = true;
      clearTimeout(S.lp);
      S.lp = setTimeout(() => {
        if (!S.drag || S.drag.teg !== 'faera') return;
        if (Math.hypot(S.drag._x - S.drag.x0, S.drag._y - S.drag.y0) > 10) return;
        const merki = S.drag.merki;
        S.drag = null;
        S.slepptSmellur = true;
        opnaValmynd({ clientX: e.clientX, clientY: e.clientY }, merki);
      }, 480);
      try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
      stikaValid();
      return true;
    }
    if (S.valinn) {
      S.stadsetja = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
      try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
      return true;
    }
    return false;
  }

  function iDragi() { return !!S.drag; }
  // Merki fært annars staðar en á striganum (vinnumyndin, 445): sama frágangur og þegar drætti lýkur hér — afturkalla,
  // samstilla hæðir, teikna og vista um TeiknVistun.skrifa.
  function faert(m, fraX, fraY) {
    if (!m) return;
    if (m.x !== fraX || m.y !== fraY) skraUndo({ teg: 'faera', merki: afritMerki(m), fraX, fraY });
    S.valinnMerki = m;
    try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
    endurteikna();
    vistaAdThjoni();
  }

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
      S.drag._x = e.clientX; S.drag._y = e.clientY;
      if (S.lp && Math.hypot(e.clientX - S.drag.x0, e.clientY - S.drag.y0) > 10) {
        clearTimeout(S.lp); S.lp = 0;
      }
      if (S.lp) return;
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
    clearTimeout(S.lp); S.lp = 0;
    const bid = S.bid; S.bid = null;
    const d = S.drag; S.drag = null;
    const stad = S.stadsetja; S.stadsetja = null;
    felaDraug();
    const p = strigaHnit(e);
    if (d && d.teg === 'faera') {
      S.slepptSmellur = true;
      if (p && d.merki) { d.merki.x = p.x; d.merki.y = p.y; }
      if (d.merki && (d.merki.x !== d.fraX || d.merki.y !== d.fraY)) {
        skraUndo({ teg: 'faera', merki: afritMerki(d.merki), fraX: d.fraX, fraY: d.fraY });
      }
      try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
      endurteikna();
      vistaAdThjoni();
      return;
    }
    if (d && (d.teg === 'taeki' || d.teg === 'stimpill')) {
      S.slepptSmellur = true;
      if (!p) { endurteikna(); return; }
      if (d.teg === 'taeki') setjaTaeki(d.unitId, p.x, p.y);
      else setjaEitt(d.sign, p.x, p.y);
      vistaAdThjoni();
      stikaValid();
      return;
    }
    if (stad && S.valinn && p) {
      S.slepptSmellur = true;
      setjaEitt(S.valinn, p.x, p.y);
      vistaAdThjoni();
      stikaValid();
      return;
    }
    if (bid && !d) stikaValid();
  }

  function draugur() {
    let g = document.getElementById('fp-draugur');
    if (!g) {
      g = document.createElement('div'); g.id = 'fp-draugur';
      g.style.cssText = 'position:fixed;z-index:100040;pointer-events:none;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:7px;background:#c93c1d;color:#fff;font:700 10px system-ui,sans-serif;display:none;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.35);border:2px solid #fff';
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
    e.preventDefault();
    try { if (e.currentTarget && e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    S.bid = Object.assign({ teg, pointerId: e.pointerId, x: e.clientX, y: e.clientY }, gogn);
  }

  function nyttTalning() {
    const p = plan();
    if (!p) return { n: 0, eftir: {} };
    const v = window.TeiknBord && typeof TeiknBord.virk === 'function' ? TeiknBord.virk() : 0;
    const hs = Array.isArray(p.haedir) && p.haedir.length ? p.haedir : null;
    const merki = hs ? hs.reduce((a, h, i) => a.concat(i === v ? (p.markers || []) : (h && h.markers) || []), []) : (p.markers || []);
    const eftir = {};
    let n = 0;
    merki.forEach(m => { if (erNytt(m)) { n++; const t = m.tegund || 'tæki'; eftir[t] = (eftir[t] || 0) + 1; } });
    return { n, eftir };
  }
  function nyttLina() {
    const panel = document.getElementById('fp-panel');
    if (!panel) return;
    const t = nyttTalning();
    let el = document.getElementById('fp-nytt');
    if (!t.n) { if (el && !el.hidden) el.hidden = true; return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'fp-nytt';
      el.style.cssText = 'margin:6px 8px;padding:6px 8px;border:1px solid rgba(79,70,229,.35);border-radius:6px;background:rgba(79,70,229,.08);font-size:12px;line-height:1.35;color:#3730a3';
      el.title = 'Tæki sem á eftir að skrá á félagið — tillaga sem bíður samþykkis eiganda. Tengjast sjálfkrafa þegar tækin hafa verið skráð (TurboPaint: Vista í úttekt).';
      const listi = document.getElementById('fp-unit-list');
      if (listi && listi.parentNode === panel) panel.insertBefore(el, listi.nextSibling);
      else panel.appendChild(el);
    }
    if (el.hidden) el.hidden = false;
    const tegundir = Object.keys(t.eftir).map(k => k + ' ' + t.eftir[k]).join(', ');
    const texti = 'Nýtt (óskráð): ' + t.n + ' — ' + t.n + ' ný tæki í biðstöðu, bíða samþykkis: ' + tegundir;
    // aðeins skrifað ef það breyttist (annars lykkjar MutationObserver-inn — audit-teikning-merking)
    if (el.textContent !== texti) el.textContent = texti;
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
        if (e.button != null && e.button !== 0) return;
        S.valinn = id;
        S.valinnMerki = null;
        hefjaFraLista(e, 'stimpill', { sign: id, stutt: def.stutt, litur: def.litur });
        stikaValid();
      });
      b.addEventListener('dragstart', e => { e.preventDefault(); });
      b.addEventListener('click', e => {
        e.preventDefault();
        S.valinn = id;
        S.valinnMerki = null;
        const info = document.getElementById('fp-info');
        if (info) info.textContent = 'Valið: ' + def.nafn + ' — smelltu á teikninguna eða dragðu merkið þangað.';
        stikaValid();
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
        S.valinnMerki = null;
        F._selectedUnitId = u.id;
        hefjaFraLista(e, 'taeki', { unitId: u.id, stutt: String(u.type || 'SLT').slice(0, 3).toUpperCase() });
        stikaValid();
      });
      rod.addEventListener('click', e => {
        if (e.target && e.target.closest && e.target.closest('button')) return;
        const pl = plan();
        const merki = pl && (pl.markers || []).find(m => m.unitId === u.id);
        if (!merki) return;
        if (window.TeiknBord && typeof TeiknBord.faraAd === 'function') TeiknBord.faraAd(merki.x, merki.y);
      });
      rod.addEventListener('dragstart', e => { e.preventDefault(); });
    });
  }

  function synlegStaerd() {
    const c = document.getElementById('fp-canvas');
    const crW = c ? c.getBoundingClientRect().width : 0;
    if (S.valinnMerki) return merkiStaerd(S.valinnMerki, crW);
    return sjalfStaerd(passaBreidd(crW));
  }
  function skraStaerd(n, vista) {
    const v = klemmaStaerd(n);
    if (!v) return 0;
    const p = plan();
    if (S.valinnMerki) {
      if (!S._staerdUndo) S._staerdUndo = { merki: S.valinnMerki, fra: S.valinnMerki.staerd || 0 };
      S.valinnMerki.staerd = v;
    } else if (p) {
      if (!S._staerdUndo) S._staerdUndo = { sjalf: true, fra: p.stimpilStaerd || 0 };
      p.stimpilStaerd = v;
      const hs = p.haedir;
      const i = window.TeiknBord && typeof TeiknBord.virk === 'function' ? TeiknBord.virk() : 0;
      if (hs && hs[i]) hs[i].stimpilStaerd = v;
      try { localStorage.setItem(STAERD_LS, String(v)); } catch (_) {}
    }
    try { if (FP() && FP()._renderCanvas) FP()._renderCanvas(); } catch (_) {}
    try { const y = document.getElementById('fp-yfirlag'); if (y) y._t433 = ''; } catch (_) {}
    if (vista) {
      if (S._staerdUndo) {
        const u = S._staerdUndo; S._staerdUndo = null;
        if (u.fra !== v) skraUndo({ teg: 'staerd', merki: u.merki ? afritMerki(u.merki) : null, fra: u.fra, sjalf: !!u.sjalf });
      }
      try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
      vistaAdThjoni();
    }
    return v;
  }
  function stikaStaerdHvarfa() {
    const panel = document.getElementById('fp-panel');
    if (!panel) return;
    let wrap = document.getElementById('fp-stimpil-staerd-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'fp-stimpil-staerd-wrap';
      wrap.innerHTML =
        '<div class="fp-stimpil-lbl" id="fp-stimpil-staerd-lbl">Stærð tákna</div>' +
        '<div class="fp-staerd-rod">' +
          '<input type="range" id="fp-stimpil-staerd" min="' + STAERD_MIN + '" max="' + STAERD_MAX + '" step="2" aria-label="Stærð tákna">' +
          '<span id="fp-stimpil-staerd-val"></span>' +
        '</div>';
      const rod = document.getElementById('fp-stimpil');
      const adgerd = document.getElementById('fp-merki-adgerd');
      if (adgerd && adgerd.parentNode) adgerd.parentNode.insertBefore(wrap, adgerd.nextSibling);
      else if (rod && rod.parentNode) rod.parentNode.insertBefore(wrap, rod.nextSibling);
      else panel.insertBefore(wrap, panel.firstChild);
      const inn = wrap.querySelector('#fp-stimpil-staerd');
      inn.addEventListener('pointerdown', e => e.stopPropagation());
      inn.addEventListener('input', () => {
        const n = skraStaerd(inn.value, false);
        const val = document.getElementById('fp-stimpil-staerd-val');
        if (val) val.textContent = n + ' px';
      });
      inn.addEventListener('change', () => { skraStaerd(inn.value, true); });
    }
    const inn = document.getElementById('fp-stimpil-staerd');
    const val = document.getElementById('fp-stimpil-staerd-val');
    const lbl = document.getElementById('fp-stimpil-staerd-lbl');
    const n = synlegStaerd();
    const ser = !!S.valinnMerki;
    const lblTxt = ser ? (erStimpil(S.valinnMerki) ? 'Stærð þessa skiltis' : 'Stærð þessa tækis') : 'Stærð tákna';
    if (lbl && lbl.textContent !== lblTxt) lbl.textContent = lblTxt;
    const px = n + ' px';
    if (val && val.textContent !== px) val.textContent = px;
    if (inn && document.activeElement !== inn && String(inn.value) !== String(n)) inn.value = String(n);
  }

  function stikaValid() {
    if (S._stika) return;
    S._stika = true;
    try {
      document.querySelectorAll('#fp-stimpil .fp-stimpill').forEach(b => {
        b.classList.toggle('on', !!S.valinn && b.getAttribute('data-sign') === S.valinn);
      });
      const main = document.getElementById('fp-main');
      if (main) main.classList.toggle('fp-armadur', !!S.valinn);
      const info = document.getElementById('fp-info');
      let msg = null;
      if (S.valinn) {
        const def = STIMPLAR.find(s => s.id === S.valinn);
        if (def) msg = 'Valið: ' + def.nafn + ' — smelltu á teikninguna eða dragðu merkið þangað.';
      } else if (S.valinnMerki) {
        msg = 'Valið á teikningu: ' + nafnMerkis(S.valinnMerki) + ' — snúðu, breyttu eða eyddu í ræmunni.';
      }
      if (info && msg && info.textContent !== msg) info.textContent = msg;
      const panel = document.getElementById('fp-panel');
      if (!panel) return;
      let box = document.getElementById('fp-merki-adgerd');
      const m = S.valinnMerki;
      const lyk = (m ? String(m.unitId) + ':' + (m.sign || '') + ':' + (m.takn || '') + ':' + (m.rot || 0) + ':' + (m.staerd || '') + ':' + (erStimpil(m) ? 's' : 't') : '') + '|' + (S.valinn || '');
      if (!m) {
        if (box && !box.hidden) { box.hidden = true; box.dataset.ok = lyk; }
        return;
      }
      if (!box) {
        box = document.createElement('div');
        box.id = 'fp-merki-adgerd';
        const rod = document.getElementById('fp-stimpil');
        if (rod && rod.parentNode) rod.parentNode.insertBefore(box, rod.nextSibling);
        else panel.insertBefore(box, panel.firstChild);
        box.addEventListener('click', ev => {
          const b = ev.target.closest('[data-act]');
          if (!b || !S.valinnMerki) return;
          ev.preventDefault();
          const act = b.getAttribute('data-act');
          const sign = b.getAttribute('data-sign');
          const takn = b.getAttribute('data-takn');
          if (act === 'snua') snuaMerki(S.valinnMerki);
          else if (act === 'afrita') {
            const ny = afritaMerki(S.valinnMerki);
            if (ny) { vistaAdThjoni(); S.valinnMerki = ny; }
          } else if (act === 'eyda') eydaMerki(S.valinnMerki);
          else if (act === 'skipta' && sign) breytaStimpil(S.valinnMerki, sign);
          else if (act === 'takn' && takn) breytaTakn(S.valinnMerki, takn);
          stikaValid();
        });
      }
      if (box.dataset.ok === lyk && !box.hidden) return;
      box.hidden = false;
      box.dataset.ok = lyk;
      const stimp = erStimpil(m);
      box.innerHTML = '<div class="fp-stimpil-lbl">Valið</div>' +
        '<div class="fp-merki-nafn">' + esc(nafnMerkis(m)) + '</div>' +
        '<div class="fp-merki-acts">' +
          '<button type="button" data-act="snua">Snúa</button>' +
          (stimp ? '<button type="button" data-act="afrita">Afrita</button>' : '') +
          '<button type="button" class="fp-vm-hætta" data-act="eyda">' + (stimp ? 'Eyða' : 'Fjarlægja af teikningu') + '</button></div>' +
        '<div class="fp-stimpil-lbl">Breyta í</div>' +
        (stimp ? stimpilRod(m.sign, 'skipta') : taknRod(m.takn || ''));
      malaValmyndIkon(box);
    } finally {
      try { stikaStaerdHvarfa(); } catch (_) {}
      S._stika = false;
    }
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
      else if (sign) setjaEitt(sign, p.x, p.y);
      else return;
      vistaAdThjoni();
    });
    main.addEventListener('contextmenu', e => {
      const aStriga = e.target === main || e.target.id === 'fp-canvas' || e.target.id === 'fp-drop-msg' || e.target.id === 'fp-yfirlag';
      if (!aStriga) return;
      e.preventDefault();
      e.stopPropagation();
      if (document.getElementById('fp-3d')) return;
      if (hamur()) return;
      if (!FP() || !FP().bgImage) return;
      const hit = finnaMerki(e);
      opnaValmynd(e, hit);
    }, true);
  }

  function still() {
    let st = document.getElementById('fp-merking-css');
    const css =
      '#fp-stimpil{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 10px;align-items:center}' +
      '#fp-stimpil .fp-stimpil-lbl,#fp-merki-adgerd .fp-stimpil-lbl,#fp-stimpil-staerd-wrap .fp-stimpil-lbl{width:100%;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:2px}' +
      '#fp-stimpil .fp-stimpill{display:flex;align-items:center;gap:5px;padding:4px 6px 4px 4px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:rgba(255,255,255,.82);font:600 11px system-ui,sans-serif;cursor:grab;flex:1 1 140px;min-width:0;max-width:100%;-webkit-user-drag:none;user-select:none}' +
      '#fp-stimpil .fp-stimpill.on{border-color:#c9a54a;box-shadow:0 0 0 2px rgba(201,165,74,.45);background:rgba(201,165,74,.12)}' +
      '#fp-stimpil .fp-stimpill span,#fp-stimpil .fp-stimpill-ico{display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:5px;color:#fff;font:700 8px system-ui,sans-serif;overflow:hidden;flex:none}' +
      '#fp-stimpil-staerd-wrap{margin:0 0 10px;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04)}' +
      '#fp-stimpil-staerd-wrap .fp-staerd-rod{display:flex;align-items:center;gap:8px}' +
      '#fp-stimpil-staerd{flex:1 1 auto;min-width:0;accent-color:#c9a54a;height:28px;cursor:pointer}' +
      '#fp-stimpil-staerd-val{flex:none;min-width:44px;text-align:right;font:700 11px system-ui,sans-serif;color:#f1ede4}' +
      '#fp-merki-adgerd{margin:0 0 10px;padding:8px;border-radius:10px;border:1px solid rgba(201,165,74,.35);background:rgba(201,165,74,.08)}' +
      '#fp-merki-adgerd[hidden]{display:none!important}' +
      '#fp-merki-adgerd .fp-merki-nafn{font:700 12px system-ui,sans-serif;color:#f1ede4;margin:0 0 6px}' +
      '#fp-merki-adgerd .fp-merki-acts{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 8px}' +
      '#fp-merki-adgerd .fp-merki-acts button{flex:1 1 auto;min-height:32px;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(20,18,15,.55);color:#f1ede4;font:600 11px system-ui,sans-serif;cursor:pointer}' +
      '#fp-merki-adgerd .fp-vm-hætta{color:#fecaca}' +
      '#fp-merki-adgerd .fp-vm-stimp{display:flex;flex-wrap:wrap;gap:6px}' +
      '#fp-merki-adgerd .fp-vm-ico{width:36px;height:36px;padding:0;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer}' +
      '#fp-merki-adgerd .fp-vm-ico.on{box-shadow:0 0 0 2px #c9a54a}' +
      '#fp-unit-list>div{cursor:grab;-webkit-user-drag:none;user-select:none}' +
      '#fp-canvas.fp-drop,#fp-main.fp-armadur #fp-canvas{outline:2px dashed rgba(201,165,74,.55);outline-offset:-2px;cursor:copy}' +
      '#fp-afturkalla{padding:5px 10px;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(20,18,15,.88);color:#f1ede4;font:600 11px system-ui,sans-serif;cursor:pointer}' +
      '#fp-afturkalla[hidden]{display:none!important}' +
      '#fp-valmynd{position:fixed;z-index:100050;min-width:196px;padding:6px;border-radius:12px;background:#1c1916;color:#f1ede4;border:1px solid rgba(255,255,255,.14);box-shadow:0 14px 40px rgba(0,0,0,.5);font:600 13px system-ui,sans-serif}' +
      '#fp-valmynd .fp-vm-h{padding:6px 10px 8px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.42)}' +
      '#fp-valmynd .fp-vm-li{display:block;width:100%;text-align:left;padding:8px 10px;border:0;background:transparent;color:inherit;border-radius:8px;cursor:pointer;font:inherit}' +
      '#fp-valmynd .fp-vm-li:hover,#fp-valmynd .fp-vm-ico:hover,#fp-merki-adgerd .fp-vm-ico:hover{background:rgba(255,255,255,.08)}' +
      '#fp-valmynd .fp-vm-hætta{color:#fecaca}' +
      '#fp-valmynd .fp-vm-div{height:1px;margin:4px 8px;background:rgba(255,255,255,.1)}' +
      '#fp-valmynd .fp-vm-stimp{display:flex;flex-wrap:wrap;gap:6px;padding:4px 6px 8px}' +
      '#fp-valmynd .fp-vm-ico{width:36px;height:36px;padding:0;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer}' +
      '#fp-valmynd .fp-vm-ico.on{box-shadow:0 0 0 2px #c9a54a}';
    if (!st) {
      st = document.createElement('style'); st.id = 'fp-merking-css';
      document.head.appendChild(st);
    }
    if (st.textContent !== css) st.textContent = css;
  }

  function vefja() {
    const F = FP();
    if (!F || F.__merkingSkreytt) return !!F && !!F.__merkingSkreytt;
    if (typeof F.open !== 'function' || typeof F._renderPanel !== 'function') return false;
    const panel = F._renderPanel.bind(F);
    F._renderPanel = function () {
      panel();
      try { stikaStimpla(); geraDraggandi(); stikaValid(); } catch (_) {}
      try { nyttLina(); } catch (_) {}
    };
    if (typeof F.selectUnit === 'function' && !F.__merkingSelect) {
      const velja = F.selectUnit.bind(F);
      F.selectUnit = function (id) { S.valinn = null; return velja(id); };
      F.__merkingSelect = true;
    }
    const smell = F.onCanvasClick.bind(F);
    F.onCanvasClick = function (e) {
      if (S.slepptSmellur || S.drag || S.valmynd) { S.slepptSmellur = false; return; }
      const hit = finnaMerki(e);
      if (hit) {
        S.valinnMerki = hit;
        S.valinn = null;
        stikaValid();
        return;
      }
      if (S.valinn && this.bgImage) {
        const p = strigaHnit(e);
        if (p) { setjaEitt(S.valinn, p.x, p.y); vistaAdThjoni(); }
        stikaValid();
        return;
      }
      if (S.valinnMerki) { S.valinnMerki = null; stikaValid(); }
      const uid = this._selectedUnitId;
      smell(e);
      try { if (window.TeiknBord && TeiknBord.samstilla) TeiknBord.samstilla(); } catch (_) {}
      if (uid) vistaAdThjoni();
    };
    const info = document.getElementById('fp-info');
    if (info && /Veldu tæki/i.test(info.textContent || '')) info.textContent = 'Smelltu á merki, svo á teikninguna — eitt merki í einu. Smelltu á merkið til að snúa, breyta eða eyða.';
    F.__merkingSkreytt = true;
    return true;
  }

  function tikk() {
    if (S._tikk) return;
    const m = document.getElementById('modal-floorplan');
    if (!m || !m.isConnected) return;
    S._tikk = true;
    try {
      still();
      vefja();
      stikaStimpla();
      geraDraggandi();
      tengjaDropp();
      stikaValid();
      nyttLina();
      stikaStaerdHvarfa();
      afturkallaTakki();
    } finally {
      S._tikk = false;
    }
  }

  document.addEventListener('pointermove', e => { if (S.drag || S.bid) faeraDrag(e); }, true);
  document.addEventListener('pointerup', e => { if (S.drag || S.bid || S.stadsetja) lokaDrag(e); }, true);
  document.addEventListener('pointercancel', e => { if (S.drag || S.bid || S.stadsetja) lokaDrag(e); }, true);
  document.addEventListener('pointerdown', e => {
    if (S.valmynd && !S.valmynd.contains(e.target)) lokaValmynd();
  }, true);
  document.addEventListener('keydown', e => {
    const modal = document.getElementById('modal-floorplan');
    if (!modal || !modal.isConnected) return;
    if (modal.style.display === 'none' && !modal.classList.contains('open')) return;
    const t = e.target;
    if (t && t.closest && t.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (e.key === 'Escape') {
      lokaValmynd();
      S.valinn = null;
      S.valinnMerki = null;
      stikaValid();
      return;
    }
    const z = e.key === 'z' || e.key === 'Z';
    if (z && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      afturkalla();
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && S.valinnMerki) {
      e.preventDefault();
      eydaMerki(S.valinnMerki);
    }
  }, true);

  window.TeiknMerking = {
    grip, iDragi, setjaTaeki, setjaStimpil, setjaEitt, vistaAdThjoni, erStimpil, erNytt, nyttTalning, stimplar: STIMPLAR,
    tikk, afturkalla, eydaMerki, snuaMerki, afritaMerki, opnaValmynd, finnaMerki,
    stimpilPx: merkiStaerd, skjaStaerd, passaBreidd, setjaStaerd: skraStaerd, sjalfStaerd, breytaTakn,
    velja: m => { S.valinnMerki = m || null; stikaValid(); },
    // Vinnumyndin (445): hvaða stimpill er vopnaður á ræmunni, hvaða merki er valið, og frágangur færslu.
    vopn: () => S.valinn,
    valid: () => S.valinnMerki,
    faert
  };

  if (!vefja()) { let n = 0; const i = setInterval(() => { if (vefja() || ++n > 80) clearInterval(i); }, 150); }
  setInterval(() => { try { tikk(); } catch (_) {} }, 400);
  new MutationObserver(() => { try { tikk(); } catch (_) {} }).observe(document.documentElement, { childList: true, subtree: true });
})();
