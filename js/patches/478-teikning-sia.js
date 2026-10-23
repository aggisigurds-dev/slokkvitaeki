/* === TEIKNING: SÍA Á MERKI (478) =================================================
 *
 * Agnar 22.10.2026, eftir að greiningarmerkin (ÚT, reykskynjarar, hönnuð tæki, tillögur Arnolds) voru sett á öll borð:
 * „settu samt filter líka inn á teikningar". Á hverri hæð eru nú tugir merkja — sían sýnir/felur eftir flokki.
 *
 * FLOKKAR: ÚT-skilti · Skynjarar (reyk, hita) · Slökkvitæki · Slöngur · Tillögur (Arnolds, „Nýtt"-merki með unitId n:…:gt…) · Annað.
 * Merki sem er falið er hvorki teiknað (2D, vinnumynd, 3D) né hægt að grípa það — en það er ALDREI eytt eða breytt;
 * sían snertir enga gagnaröð. Valið vistast á þjóninum (Vidmot 'teikning.sia', eins á öllum vélum — regla 15.10.2026).
 *
 * Hnapparnir sitja neðst til vinstri í teikningarglugganum (2D og vinnumynd) og neðst til hægri í 3D; aðeins flokkar sem
 * eru til á hæðinni (3D: á öllum hæðum). Útlit: Brunastál C — stálhnappar, gull þar sem flokkur er sýndur.
 * ================================================================================= */
(() => {
  if (window.TeiknSia) return;

  const KEY = 'teikning.sia';
  const FL = [
    { k: 'greining', nafn: 'Greining', lit: '#a16207' },   // aukaflokkur: merki sem búnaðargreiningin setti (innflutt, unitId …:g…) — ofan á flokk merkisins
    { k: 'ut', nafn: 'ÚT-skilti', lit: '#15803d' },
    { k: 'skyn', nafn: 'Skynjarar', lit: '#c93c1d' },
    { k: 'slt', nafn: 'Slökkvitæki', lit: '#e11d2e' },
    { k: 'slanga', nafn: 'Slöngur', lit: '#1f5fbf' },
    { k: 'till', nafn: 'Tillögur', lit: '#4f46e5' },
    { k: 'annad', nafn: 'Annað', lit: '#6b7280' }
  ];
  const FP = () => window.FloorPlan;
  const GULL = '#d9b45a', DOKKT = 'rgba(20,18,15,.86)';

  // Sjálfgefið (Agnar 23.10.2026: „slepptu bara reykskynjurunum og ÚT-skiltunum sem default“): skynjarar og ÚT-skilti falin þar til valið er skráð — merkin eyðast aldrei, flísarnar kveikja á þeim aftur
  const SJALFGEFID_AF = ['skyn', 'ut'];
  const stada = () => {
    try { const v = window.Vidmot ? Vidmot.lesa(KEY, null) : null; return v && Array.isArray(v.af) ? v : { af: SJALFGEFID_AF.slice() }; } catch (_) { return { af: SJALFGEFID_AF.slice() }; }
  };
  const vista = af => { try { if (window.Vidmot) Vidmot.setja(KEY, { af }); } catch (_) {} };

  // Flokkur merkis: stimpill (kind 'sign'), „Nýtt"-merki (tegund) eða skráð tæki (tegund úr einingu).
  function flokkur(m, units) {
    if (!m) return 'annad';
    const id = typeof m.unitId === 'string' ? m.unitId : '';
    if (m.kind === 'sign' || id.indexOf('s:') === 0) {
      const s = String(m.sign || '');
      if (/^(ut|neyðarútgangur|bjorgunarop)$/.test(s)) return 'ut';
      if (/^(reykskynjari|hitaskynjari)$/.test(s)) return 'skyn';
      if (s === 'skilti_slt') return 'slt';
      if (s === 'hose' || s === 'skilti_slanga') return 'slanga';
      return 'annad';
    }
    if (m.nytt === true || id.indexOf('n:') === 0) {
      if (/^n:[a-z]+:gt/.test(id)) return 'till';                  // tillaga Arnolds (greining_merki_inn)
      const t = String(m.tegund || '').toLowerCase();
      if (/reyk|hita/.test(t)) return 'skyn';
      if (/slang|slong/.test(t)) return 'slanga';
      if (/vatn|duft|co2|slökk|slokk/.test(t)) return 'slt';
      return 'annad';
    }
    const u = (units || (FP() && FP().units) || []).find(q => q && q.id === m.unitId);
    const t = String((u && u.type) || '').toLowerCase();
    if (/slang|kefli|slong/.test(t)) return 'slanga';
    if (/reyk|hita/.test(t)) return 'skyn';
    return 'slt';
  }
  // RAUNSÆ TÁKN (434): myndir af tækjunum í stað málmplötutákns — sjálfgefið kveikt, eitt val fyrir allar vélar
  const raunsaett = () => { try { const v = window.Vidmot ? Vidmot.lesa('teikning.raunsaett', null) : null; return v === false ? false : true; } catch (_) { return true; } };
  function skiptaRaun() { try { if (window.Vidmot) Vidmot.setja('teikning.raunsaett', !raunsaett()); } catch (_) {} beita(); }
  // Innflutt greiningarmerki (greining_merki_inn / Greining ▸ Teikning): unitId s:ut:g… · n:<tegund>:g… · n:<tegund>:gt… — Agnar 23.10.2026: „fá teikninguna með filter til að taka greininguna í burtu“
  const erGreining = m => !!m && /^(s|n):[a-z0-9]+:gt?[A-Za-z0-9]/.test(typeof m.unitId === 'string' ? m.unitId : '');
  // 3D: flokkur + '+g' þegar merkið er greiningarmerki (erFalinn skilur samsetta lykilinn)
  const flokkur3 = (m, units) => flokkur(m, units) + (erGreining(m) ? '+g' : '');
  const erFalinn = k => { const af = stada().af, p = String(k || '').split('+'); return af.indexOf(p[0]) >= 0 || (p[1] === 'g' && af.indexOf('greining') >= 0); };
  const falid = (m, units) => { const af = stada().af; return !!af.length && (af.indexOf(flokkur(m, units)) >= 0 || (af.indexOf('greining') >= 0 && erGreining(m))); };
  const lykill = () => stada().af.join(',');

  /* ── endurteikning eftir val ── */
  function beita() {
    try { const F = FP(); if (F && F._renderCanvas) F._renderCanvas(); } catch (_) {}
    try { const y = document.getElementById('fp-yfirlag'); if (y) y._t433 = ''; } catch (_) {}
    // vinnumyndin (445) teiknar sig upp úr fingrafari sem inniheldur TeiknSia.lykill() — ekki kalla á Endurteikna (það opnar 3D)
    try { if (window.TeiknSia3d) window.TeiknSia3d(); } catch (_) {}
    tikk();
  }
  function skipta(k) {
    const af = stada().af.slice(), i = af.indexOf(k);
    if (i >= 0) af.splice(i, 1); else af.push(k);
    vista(af); beita();
  }

  /* ── talning: núverandi hæð (2D) eða allar hæðir (3D) ── */
  function talning(allar) {
    const F = FP(), n = {};
    let ml = [];
    if (allar && window.TeiknBord && TeiknBord.haedir) {
      try { (TeiknBord.haedir() || []).forEach(h => { ml = ml.concat(h.markers || []); }); } catch (_) {}
    }
    if (!ml.length) { const p = F && F.companyId && F.plans && F.plans[F.companyId]; ml = (p && p.markers) || []; }
    const units = (F && F.units) || [];
    ml.forEach(m => { if (m) { const k = flokkur(m, units); n[k] = (n[k] || 0) + 1; if (erGreining(m)) n.greining = (n.greining || 0) + 1; } });
    return n;
  }

  /* ── hnappastika ── */
  const hnappur = 'height:26px;padding:0 10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);font:700 11.5px system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;';
  function teiknaStiku(el, allar, fela) {
    const n = talning(allar), af = stada().af;
    const fl = FL.filter(f => n[f.k]);
    const fingur = (allar ? 'a' : 'e') + (fela ? 'f' : '') + '|' + fl.map(f => f.k + n[f.k]).join(',') + '|' + af.join(',') + '|' + raunsaett();
    if (el._fp === fingur) return;
    el._fp = fingur;
    if (!fl.length || fela) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = 'flex';
    el.innerHTML = '<span style="font:700 10.5px ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:#c8c2b4;align-self:center;padding-right:2px">Sía</span>' +
      fl.map(f => {
        const syn = af.indexOf(f.k) < 0;
        return '<button type="button" data-sia="' + f.k + '" aria-pressed="' + syn + '" title="' + (syn ? 'Fela ' : 'Sýna ') + f.nafn.toLowerCase() + ' á teikningunni (merkin eyðast ekki)" style="' + hnappur +
          'background:' + (syn ? DOKKT : 'transparent') + ';color:' + (syn ? '#f1ede4' : '#8d887c') + ';' + (syn ? 'border-color:' + GULL + ';' : '') + (syn ? '' : 'text-decoration:line-through;') + '">' +
          '<i style="width:9px;height:9px;border-radius:50%;background:' + f.lit + ';display:inline-block;opacity:' + (syn ? 1 : .35) + '"></i>' + f.nafn + ' <b style="font-weight:700;opacity:.8">' + n[f.k] + '</b></button>';
      }).join('') +
      (function () {
        const r = raunsaett();
        return '<button type="button" data-raun="1" aria-pressed="' + r + '" title="Myndir af tækjunum sjálfum í stað tákna" style="' + hnappur +
          'background:' + (r ? DOKKT : 'transparent') + ';color:' + (r ? '#f1ede4' : '#8d887c') + ';' + (r ? 'border-color:' + GULL + ';' : '') + '">Raunsæ tákn</button>';
      })();
  }
  function festa(host, id, css, allar, fela) {
    if (!host) return;
    let el = host.querySelector(':scope > #' + id);
    if (!el) {
      el = document.createElement('div'); el.id = id;
      el.style.cssText = 'position:absolute;z-index:12;display:none;flex-wrap:wrap;gap:6px;align-items:center;pointer-events:auto;' + css;
      el.addEventListener('click', e => {
        const r = e.target.closest && e.target.closest('[data-raun]'); if (r) { e.preventDefault(); e.stopPropagation(); skiptaRaun(); return; }
        const b = e.target.closest && e.target.closest('[data-sia]'); if (b) { e.preventDefault(); e.stopPropagation(); skipta(b.getAttribute('data-sia')); }
      });
      el.addEventListener('mousedown', e => e.stopPropagation());
      el.addEventListener('pointerdown', e => e.stopPropagation());
      host.appendChild(el);
    }
    teiknaStiku(el, allar, fela);
  }
  function tikk() {
    if (!document.getElementById('modal-floorplan')) return;
    const d3 = document.getElementById('fp-3d');
    // 2D og vinnumynd: lóðrétt röð hægra megin undir þysjuninni (neðst til vinstri er leiðbeiningalína vinnumyndarinnar); falin meðan 3D er opið
    festa(document.getElementById('fp-main'), 'fp-sia', 'right:10px;top:58px;flex-direction:column;align-items:flex-end;max-width:240px', false, !!d3);
    festa(d3, 'fp-sia3', 'right:10px;bottom:64px;max-width:calc(100% - 20px);justify-content:flex-end', true);
  }

  window.TeiknSia = { flokkur, flokkur3, erGreining, falid, erFalinn, lykill, beita, skipta, flokkar: FL, stada, raunsaett };
  setInterval(tikk, 400);
  try { new MutationObserver(() => tikk()).observe(document.body, { childList: true }); } catch (_) {}
})();
