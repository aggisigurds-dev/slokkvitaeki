/* === TEIKNING: LEIT OG SÍA Í TÆKJALISTANUM (481) ==================================
 *
 * Agnar 23.10.2026 (Álfaborg): „Það er rosalega erfitt að finna eitthvað þarna, skrollandi upp og niður." Tækjalistinn hægra megin í
 * teikningarglugganum er ein löng röð af spjöldum (serial · tegund · staða) — tugir tækja á hverjum stað og engin leið að komast beint að einu.
 *
 * NÚ: leitarreitur efst á listanum (festur — fylgir með þegar skrunað er) sem leitar í raðnúmeri og tegund, og sía á stöðu:
 *   Öll · Ekki merkt · Merkt hér · Á annarri hæð   + tegundaval. Aðeins DISPLAY á spjöldunum breytist — röð og vísitölur haldast
 *   (433/383 vísa í spjöld eftir vísitölu tækis), og valið tæki sést alltaf. Enter velur fyrsta tækið sem sést.
 * Valin sía (staða + tegund) vistast á þjóninum (Vidmot 'teikning.taekjalisti', eins á öllum vélum — regla 15.10.2026); leitartextinn er tímabundinn.
 * ================================================================================= */
(() => {
  if (window.__teiknTaekjaleit) return;
  window.__teiknTaekjaleit = true;

  const KEY = 'teikning.taekjalisti';
  const FP = () => window.FloorPlan;
  const STODUR = [['', 'Öll'], ['ekki', 'Ekki merkt'], ['her', 'Merkt hér'], ['annars', 'Á annarri hæð']];
  let leit = '';                                  // tímabundið — ekki vistað
  let beinn = 0;

  const lesa = () => { try { const v = window.Vidmot ? Vidmot.lesa(KEY, null) : null; return v && typeof v === 'object' ? { s: String(v.s || ''), t: String(v.t || '') } : { s: '', t: '' }; } catch (_) { return { s: '', t: '' }; } };
  const vista = v => { try { if (window.Vidmot) Vidmot.setja(KEY, v); } catch (_) {} };
  const norm = t => String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/þ/g, 'th');
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function still() {
    if (document.getElementById('_t481-css')) return;
    const st = document.createElement('style'); st.id = '_t481-css';
    st.textContent = '' +
      '#fp-tl-sia{position:sticky;top:-12px;z-index:5;margin:-2px -12px 8px;padding:8px 12px 8px;background:rgba(26,24,20,.99);border-bottom:1px solid rgba(255,255,255,.1);display:flex;flex-direction:column;gap:6px}' +
      '#fp-tl-sia .tl-leit{position:relative}' +
      '#fp-tl-sia input{width:100%!important;box-sizing:border-box!important;height:30px!important;padding:0 26px 0 9px!important;border-radius:7px!important;border:1px solid rgba(255,255,255,.16)!important;background:rgba(255,255,255,.06)!important;color:#f1ece2!important;box-shadow:none!important;font:500 12px/1 var(--font,system-ui)!important}' +
      '#fp-tl-sia input::placeholder{color:rgba(255,255,255,.6)}' +
      '#fp-tl-sia input:focus{outline:none!important;border-color:#d9b45a!important;background:rgba(255,255,255,.09)!important}' +
      '#fp-tl-sia .tl-x{position:absolute;right:4px;top:4px;width:22px;height:22px;border:0;border-radius:5px;background:transparent;color:rgba(255,255,255,.5);font-size:15px;line-height:22px;cursor:pointer;padding:0;display:none}' +
      '#fp-tl-sia .tl-x:hover{color:#fff;background:rgba(255,255,255,.1)}' +
      '#fp-tl-sia .tl-fl{display:flex;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;gap:4px}' +
      '#fp-tl-sia select,#fp-tl-sia .tl-tal{display:none!important}' +
      '#fp-tl-sia .tl-fl button{height:23px!important;padding:0 8px!important;border-radius:999px!important;border:1px solid rgba(255,255,255,.18)!important;background:rgba(255,255,255,.05)!important;color:rgba(255,255,255,.72)!important;box-shadow:none!important;font:600 10.5px/1 var(--font,system-ui);cursor:pointer;white-space:nowrap}' +
      '#fp-tl-sia .tl-fl button:hover{border-color:rgba(217,180,90,.6)}' +
      '#fp-tl-sia .tl-fl button.on{border-color:#d9b45a!important;background:rgba(217,180,90,.18)!important;color:#f3dc9c!important}' +
      '#fp-tl-sia .tl-fl button i{font-style:normal;opacity:.6;margin-left:4px;font-weight:500}' +
      '#fp-tl-sia select{width:100%!important;height:26px!important;border-radius:7px!important;border:1px solid rgba(255,255,255,.16)!important;background-color:#26231d!important;background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%276%27%3E%3Cpath d=%27M1 1l4 4 4-4%27 fill=%27none%27 stroke=%27%23d9b45a%27 stroke-width=%271.6%27/%3E%3C/svg%3E")!important;background-repeat:no-repeat!important;background-position:right 9px center!important;-webkit-appearance:none!important;appearance:none!important;color:#e8e2d4!important;font:500 11.5px/1 var(--font,system-ui)!important;padding:0 24px 0 8px!important;box-shadow:none!important}' +
      '#fp-tl-sia .tl-tal{font:600 10px/1.2 var(--mono,monospace);color:rgba(255,255,255,.42);letter-spacing:.03em}' +
      '#fp-unit-list>.tl-tomt{color:rgba(255,255,255,.4);font-size:12px;padding:10px 4px}' +
      '#modal-floorplan.fp-simi #fp-tl-sia{position:static;margin:0 0 4px;padding:3px 0;border-bottom:0;background:transparent;flex-direction:row!important;align-items:center;flex-wrap:nowrap!important;gap:6px}' +
      '#modal-floorplan.fp-simi #fp-tl-sia .tl-leit{flex:0 0 38%}' +
      '#modal-floorplan.fp-simi #fp-tl-sia .tl-fl{flex:1;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}' +
      '#modal-floorplan.fp-simi #fp-tl-sia select,#modal-floorplan.fp-simi #fp-tl-sia .tl-tal{display:none!important}' +
      '#fp-nytt{color:#c9ccff!important;border-color:rgba(170,170,255,.5)!important}' +
      '#modal-floorplan.fp-simi #fp-nytt{font-size:11px!important;line-height:1.25!important;padding:3px 7px!important;margin:3px 6px!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
      // Tækjaspjöldin: mynd af tækinu hægra megin og skýrari stafir (Agnar 25.10.2026: „sést illa“)
      '#fp-unit-list>div[data-tt]{background-repeat:no-repeat!important;background-position:right 8px center!important;background-size:auto 62%!important;padding-right:44px!important}' +
      '#fp-unit-list>div[data-tt="l"]{background-image:url(/img/taeki/l.png)!important}' +
      '#fp-unit-list>div[data-tt="duft"]{background-image:url(/img/taeki/duft.png)!important}' +
      '#fp-unit-list>div[data-tt="co2"]{background-image:url(/img/taeki/co2.png)!important}' +
      '#fp-unit-list>div[data-tt="slanga_rod"]{background-image:url(/img/taeki/slanga_rod.png)!important}' +
      '#fp-unit-list>div>div:nth-child(1):not([style*="ff6b4a"]){color:rgba(255,255,255,.84)!important;font-size:11.5px!important;letter-spacing:.02em}' +
      '#fp-unit-list>div>div:nth-child(2){color:#fff!important;font-size:14px!important;font-weight:700!important}' +
      '#fp-unit-list>div>div:nth-child(3){font-size:11.5px!important;font-weight:600}' +
      '#fp-unit-list>div>div:nth-child(3)[style*="255,255,255,.3)"]{color:rgba(255,255,255,.68)!important}' +
      '#fp-unit-list>div>div:nth-child(3)[style*="3fb87e"]{color:#62e6a3!important}' +
      '#modal-floorplan.fp-simi #fp-unit-list>div{flex:0 0 158px!important}' +

      '#modal-floorplan.fp-simi.t442-h-merki #fp-tl-sia{display:none!important}';
    (document.head || document.documentElement).appendChild(st);
  }

  // staða tækis: ekki merkt · merkt hér · merkt á annarri hæð
  function stadaTaekis(u, herMerki, haedir, virk) {
    if (herMerki.has(u.id)) return 'her';
    for (let j = 0; j < haedir.length; j++) if (j !== virk && (haedir[j].markers || []).some(m => m && m.unitId === u.id)) return 'annars';
    return 'ekki';
  }

  function stadur() { return document.getElementById('fp-unit-list'); }
  // mynd af tækinu á spjaldinu: léttvatn · duft · CO2 · slanga (img/taeki)
  const ikon = u => { const t = norm(u && u.type); return /co2/.test(t) ? 'co2' : /duft|abc/.test(t) ? 'duft' : /slang|kefli/.test(t) ? 'slanga_rod' : 'l'; };

  function smida(el) {
    let bar = document.getElementById('fp-tl-sia');
    if (bar && bar.isConnected && bar.nextElementSibling === el) return bar;
    if (bar) bar.remove();
    bar = document.createElement('div'); bar.id = 'fp-tl-sia';
    bar.innerHTML = '<div class="tl-leit"><input type="text" id="fp-tl-leit" placeholder="Leita: raðnúmer eða tegund" autocomplete="off" spellcheck="false" aria-label="Leita í tækjum"><button type="button" class="tl-x" aria-label="Hreinsa leit">×</button></div>' +
      '<div class="tl-fl" data-r="stada"></div><select id="fp-tl-teg" aria-label="Tegund tækis"></select><div class="tl-tal"></div>';
    el.parentNode.insertBefore(bar, el);
    const inp = bar.querySelector('input'), x = bar.querySelector('.tl-x');
    // ekkert sem snertir teikninguna: smellir og lyklar hér eiga ekki að berast í stimpla-/teikningarhlustara
    ['pointerdown', 'mousedown', 'keydown', 'keyup'].forEach(ev => bar.addEventListener(ev, e => e.stopPropagation()));
    inp.addEventListener('input', () => { leit = inp.value; x.style.display = leit ? 'block' : 'none'; beita(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Escape') { inp.value = ''; leit = ''; x.style.display = 'none'; beita(); return; }
      if (e.key !== 'Enter') return;
      const f = [...el.children].find(r => r.style.display !== 'none' && !r.classList.contains('tl-tomt'));
      if (f) { e.preventDefault(); f.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 })); f.click(); }
    });
    x.addEventListener('click', () => { inp.value = ''; leit = ''; x.style.display = 'none'; beita(); inp.focus(); });
    bar.querySelector('[data-r="stada"]').addEventListener('click', e => {
      const b = e.target.closest('button[data-s]'); if (!b) return;
      const v = lesa(); v.s = b.getAttribute('data-s'); vista(v); beita();
    });
    bar.querySelector('select').addEventListener('change', e => { const v = lesa(); v.t = e.target.value; vista(v); beita(); });
    return bar;
  }

  function beita() {
    beinn = 0;
    const el = stadur(), F = FP();
    if (!el || !F || !Array.isArray(F.units)) return;
    still();
    const bar = smida(el);
    const pl = F.plans && F.plans[F.companyId], her = new Set(((pl && pl.markers) || []).map(m => m && m.unitId));
    const hs = (window.TeiknBord && TeiknBord.haedir && TeiknBord.haedir()) || [], virk = (window.TeiknBord && TeiknBord.virk && TeiknBord.virk()) || 0;
    const v = lesa(), q = norm(leit).trim(), valid = F._selectedUnitId;
    const kort = [...el.children].filter(r => !r.classList.contains('tl-tomt'));
    const tegundir = {}, tolur = { '': 0, ekki: 0, her: 0, annars: 0 };
    const eftirTegund = [];
    F.units.forEach((u, i) => {
      if (!u) return;
      const st = stadaTaekis(u, her, hs, virk), teg = String(u.type || '—');
      const passar = !q || norm(u.serial).indexOf(q) >= 0 || norm(u.type).indexOf(q) >= 0;
      eftirTegund[i] = { u, st, teg, passar };
    });
    // tölur á flísum miðast við leit + tegund (ekki stöðuvalið sjálft); tegundatölur við leit + stöðu
    eftirTegund.forEach(o => {
      if (!o) return;
      if (o.passar && (!v.t || o.teg === v.t)) { tolur[''] += 1; tolur[o.st] += 1; }
      if (o.passar && (!v.s || o.st === v.s)) tegundir[o.teg] = (tegundir[o.teg] || 0) + 1;
    });
    let synd = 0;
    kort.forEach((rod, i) => {
      const o = eftirTegund[i]; if (!o) return;
      const tt = ikon(o.u); if (rod.getAttribute('data-tt') !== tt) rod.setAttribute('data-tt', tt);
      const sja = o.u.id === valid || (o.passar && (!v.s || o.st === v.s) && (!v.t || o.teg === v.t));
      const d = sja ? '' : 'none';
      if (rod.style.display !== d) rod.style.display = d;
      if (sja) synd++;
    });
    // tómt?
    let tomt = el.querySelector(':scope > .tl-tomt');
    if (!synd && kort.length) {
      if (!tomt) { tomt = document.createElement('div'); tomt.className = 'tl-tomt'; tomt.textContent = 'Ekkert tæki passar við leitina.'; el.appendChild(tomt); }
    } else if (tomt) tomt.remove();

    // flísar
    const fl = bar.querySelector('[data-r="stada"]');
    const html = STODUR.map(([k, n]) => '<button type="button" data-s="' + k + '"' + (v.s === k ? ' class="on"' : '') + '>' + n + '<i>' + tolur[k] + '</i></button>').join('');
    if (fl._h !== html) { fl._h = html; fl.innerHTML = html; }
    const sel = bar.querySelector('select');
    const nofn = Object.keys(tegundir).sort((a, b) => a.localeCompare(b, 'is'));
    if (v.t && nofn.indexOf(v.t) < 0) nofn.push(v.t);
    const sh = '<option value="">Allar tegundir (' + F.units.length + ')</option>' + nofn.map(n => '<option value="' + esc(n) + '"' + (v.t === n ? ' selected' : '') + '>' + esc(n) + ' (' + (tegundir[n] || 0) + ')</option>').join('');
    if (sel._h !== sh) { sel._h = sh; sel.innerHTML = sh; }
    sel.style.display = Object.keys(tegundir).length > 1 || v.t ? '' : 'none';
    const inp = bar.querySelector('input');
    if (inp.value !== leit) inp.value = leit;
    bar.querySelector('.tl-x').style.display = leit ? 'block' : 'none';
    const virkt = !!(q || v.s || v.t);
    bar.querySelector('.tl-tal').textContent = virkt ? synd + ' af ' + F.units.length + ' tækjum' : F.units.length + ' tæki';
  }

  const seinka = () => { if (beinn) return; beinn = setTimeout(beita, 30); };

  function tengja() {
    const F = FP();
    if (!F || F.__taekjaleit || typeof F._renderPanel !== 'function') return false;
    const panel = F._renderPanel.bind(F);
    F._renderPanel = function () {
      panel.apply(this, arguments);
      try { beita(); } catch (_) {}
      // aðrir pappar (383 „á annarri hæð“, 433 draganleg spjöld) breyta spjöldunum á eftir — tökum líka þá breytingu
      setTimeout(() => { try { beita(); } catch (_) {} }, 90);
    };
    F.__taekjaleit = true;
    return true;
  }

  if (!tengja()) { const t = setInterval(() => { if (tengja()) clearInterval(t); }, 500); setTimeout(() => clearInterval(t), 60000); }
  // glugginn opnaður (spjöld endurbyggð án _renderPanel-kalls í sumum leiðum) — ódýr athugun, snertir ekkert í kyrrstöðu
  setInterval(() => {
    const el = stadur(); if (!el) return;
    const bar = document.getElementById('fp-tl-sia');
    if (!bar || bar.nextElementSibling !== el) seinka();
  }, 1500);
  window.TeiknTaekjaleit = { beita, lesa };
})();
