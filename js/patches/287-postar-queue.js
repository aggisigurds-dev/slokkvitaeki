/* 287-postar-queue.js
 * Þjónustuborð: adds a "📨 Póstar" queue chip next to Innhólf/Allt/Verkefni/Lokað.
 * Clicking it swaps the #vb-list content to the live póst-analysis (cowork_postsvor)
 * — the same data as postsvorun.html — with drög, skjöl and status editable inline.
 * Purely additive: never touches the native queue logic. Uses window.DB.sb.
 */
(function () {
  'use strict';
  if (window.__postarPatch) return;
  window.__postarPatch = true;

  var CHIP_ID = 'vb-postar-chip';
  var ACTIVE_STYLE = '', INACTIVE_STYLE = '';
  var active = false;
  var DATA = [];
  var filt = 'opin';
  var curId = null;

  function esc(s) {
    return (s == null ? '' : '' + s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }
  function forgB(f) {
    f = +f;
    if (f === 1) return '<span class="pv-b pv-r">🔴 Hár</span>';
    if (f === 2) return '<span class="pv-b pv-y">🟡 Mið</span>';
    return '<span class="pv-b pv-p">⚪ Lágur</span>';
  }
  function stB(s) {
    if (s === 'ósvarað') return '<span class="pv-b pv-r">Ósvarað</span>';
    if (s === 'tilbuid') return '<span class="pv-b pv-bl">Tilbúið</span>';
    if (s === 'klarad') return '<span class="pv-b pv-g">Klárað</span>';
    return '<span class="pv-b pv-p">' + esc(s || '') + '</span>';
  }
  function pass(r) {
    if (filt === 'opin') return r.status === 'ósvarað' || r.status === 'tilbuid';
    if (filt === 'osvarad') return r.status === 'ósvarað';
    if (filt === 'tilbuid') return r.status === 'tilbuid';
    if (filt === 'klarad') return r.status === 'klarad';
    return true;
  }
  function links(s) {
    return (s || '').split('\n').map(function (x) {
      x = x.trim(); if (!x) return '';
      var m = x.match(/(https?:\/\/\S+)/);
      var url = m ? m[1] : '';
      var nm = x.replace(/https?:\/\/\S+/, '').replace(/[\|\-–]\s*$/, '').trim() || url || x;
      return url
        ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">📎 ' + esc(nm) + '</a>'
        : '<span class="pv-mut">📎 ' + esc(x) + '</span>';
    }).join('');
  }

  function css() {
    if (document.getElementById('pv-css')) return;
    var st = document.createElement('style');
    st.id = 'pv-css';
    st.textContent = [
      '#vb-postar-wrap{display:flex;gap:14px;align-items:flex-start}',
      '#vb-postar-wrap .pv-list{flex:0 0 340px;max-width:340px;display:flex;flex-direction:column;gap:7px}',
      '#vb-postar-wrap .pv-detail{flex:1;min-width:0}',
      '.pv-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px}',
      '.pv-chip{font-size:11.5px;color:#cbd5e1;background:#182f61;border:1px solid #274a8f;border-radius:15px;padding:3px 11px;cursor:pointer;user-select:none}',
      '.pv-chip.on{background:linear-gradient(180deg,#2b529f,#4669b7);color:#fff;border-color:#4669b7}',
      '.pv-card{background:#0e254e;border:1px solid #1b3a6e;border-radius:10px;padding:9px 12px;cursor:pointer;color:#e2e8f0}',
      '.pv-card:hover{background:#16305a}',
      '.pv-card.on{background:#1d3a6b;border-color:#4669b7}',
      '.pv-card .pv-nm{font-weight:700;font-size:12.5px;color:#fff}',
      '.pv-card .pv-ef{color:#cbd5e1;font-size:11.5px;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pv-card .pv-rr{display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap}',
      '.pv-b{display:inline-block;font-size:9.5px;font-weight:700;border-radius:9px;padding:1px 7px;white-space:nowrap}',
      '.pv-r{background:#fee2e2;color:#991b1b}.pv-y{background:#fef9c3;color:#854d0e}.pv-g{background:#dcfce7;color:#166534}.pv-bl{background:#dbeafe;color:#1e40af}.pv-p{background:#e2e8f0;color:#475569}',
      '.pv-detail{background:#fff;border-radius:12px;padding:16px 18px;color:#1a2233}',
      '.pv-ph{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.pv-ph h3{font-size:17px;margin:0;color:#0b1f42}',
      '.pv-meta{color:#475569;font-size:12px;margin:4px 0 12px}.pv-meta a{color:#2563eb}',
      '.pv-l{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:11px 0 3px}',
      '.pv-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:8px 11px;white-space:pre-wrap;font-size:12.5px}',
      '#vb-postar-wrap textarea{width:100%;border:1px solid #d7dee8;border-radius:8px;padding:8px 10px;font:inherit;font-size:12.5px;line-height:1.55;resize:vertical;background:#fff;box-sizing:border-box}',
      '#vb-postar-wrap textarea.pv-drog{min-height:130px;background:#fffdf5;border-color:#fde68a}',
      '.pv-row{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin:9px 0}',
      '.pv-act{border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:8px;padding:6px 13px;font-size:12.5px;font-weight:700;cursor:pointer;text-decoration:none}',
      '.pv-save{background:linear-gradient(150deg,#2bbf6c,#0f6e3a);color:#fff;border:1px solid #156e3a;border-radius:8px;padding:7px 18px;font-size:13px;font-weight:700;cursor:pointer}',
      '.pv-att a{display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;border-radius:7px;padding:3px 9px;margin:2px 5px 2px 0;font-size:12px;text-decoration:none}',
      '.pv-stbtns{display:flex;gap:6px}',
      '.pv-stbtns button{border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:7px;padding:5px 12px;font-size:12px;cursor:pointer;font-weight:600}',
      '.pv-stbtns button.on.r{background:#fee2e2;color:#991b1b;border-color:#fca5a5}',
      '.pv-stbtns button.on.bl{background:#dbeafe;color:#1e40af;border-color:#93c5fd}',
      '.pv-stbtns button.on.g{background:#dcfce7;color:#166534;border-color:#86efac}',
      '.pv-mut{color:#94a3b8;font-size:11.5px}.pv-st{font-size:12px;color:#64748b}',
      '@media(max-width:820px){#vb-postar-wrap{flex-direction:column}#vb-postar-wrap .pv-list{flex:none;max-width:none;width:100%}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function renderPanel() {
    var host = document.getElementById('vb-list');
    if (!host) return;
    var opin = DATA.filter(function (r) { return r.status === 'ósvarað' || r.status === 'tilbuid'; }).length;
    var chips = [
      ['opin', 'Opin ' + opin], ['osvarad', 'Ósvarað'], ['tilbuid', 'Tilbúið'],
      ['klarad', 'Klárað'], ['allt', 'Allt ' + DATA.length]
    ].map(function (c) {
      return '<span class="pv-chip' + (filt === c[0] ? ' on' : '') + '" data-pf="' + c[0] + '">' + c[1] + '</span>';
    }).join('');
    var list = DATA.filter(pass);
    var listH = list.length ? list.map(function (r) {
      return '<div class="pv-card' + (r.id === curId ? ' on' : '') + '" data-pid="' + r.id + '">' +
        '<div class="pv-nm">' + esc(r.vidskiptavinur || '(óþekkt)') + '</div>' +
        '<div class="pv-ef">' + esc(r.efni || '') + '</div>' +
        '<div class="pv-rr">' + forgB(r.forgangur) + stB(r.status) +
        (r.flokkur ? '<span class="pv-b pv-p">' + esc(r.flokkur) + '</span>' : '') + '</div></div>';
    }).join('') : '<div class="pv-mut" style="padding:14px">Ekkert erindi hér.</div>';

    host.innerHTML =
      '<div id="vb-postar-wrap">' +
      '<div class="pv-list"><div class="pv-chips">' + chips + '</div>' + listH + '</div>' +
      '<div class="pv-detail" id="pv-detail">' + detailH() + '</div>' +
      '</div>';

    // 09.09.2026: BÆÐI þessi flakk-atriði teiknuðu áður upp á nýtt STRAX —
    // og endurteikningin las DATA, ekki reitina. Óvistað svarbréf hvarf því við
    // einn smell á síu eða á annað erindi. Nú er vistað fyrst (og beðið eftir
    // svari) áður en nokkuð er teiknað.
    host.querySelectorAll('.pv-chip').forEach(function (el) {
      el.addEventListener('click', async function () {
        if (oskilad) { if (!await vistaNu(false)) return; }
        filt = el.getAttribute('data-pf'); renderPanel();
      });
    });
    host.querySelectorAll('.pv-card').forEach(function (el) {
      el.addEventListener('click', async function () {
        // Uppskera + vista NÚVERANDI erindi áður en curId færist — annars er
        // textinn í reitunum orðinn munaðarlaus og enginn les hann framar.
        if (oskilad) { if (!await vistaNu(false)) return; }
        curId = +el.getAttribute('data-pid'); renderPanel();
      });
    });
    wireDetail();
  }

  function detailH() {
    if (curId == null) return '<div class="pv-mut" style="padding:30px;text-align:center">Veldu erindi til vinstri.</div>';
    var r = DATA.find(function (x) { return x.id === curId; });
    if (!r) return '<div class="pv-mut">—</div>';
    var mailto = 'mailto:' + encodeURIComponent(r.netfang || '') +
      '?subject=' + encodeURIComponent('Re: ' + (r.efni || '')) +
      '&body=' + encodeURIComponent(r.drog || '');
    return '<div class="pv-ph"><h3>' + esc(r.vidskiptavinur || '(óþekkt)') + '</h3>' +
      forgB(r.forgangur) + stB(r.status) +
      (r.flokkur ? '<span class="pv-b pv-p">' + esc(r.flokkur) + '</span>' : '') + '</div>' +
      '<div class="pv-meta">' + (r.netfang ? '<a href="mailto:' + esc(r.netfang) + '">' + esc(r.netfang) + '</a> · ' : '') +
      '<b>Efni:</b> ' + esc(r.efni || '') + '</div>' +
      (r.beidni ? '<div class="pv-l">Erindi</div><div class="pv-box">' + esc(r.beidni) + '</div>' : '') +
      (r.uppl ? '<div class="pv-l">Upplýsingar úr kerfinu</div><div class="pv-box">' + esc(r.uppl) + '</div>' : '') +
      '<div class="pv-l">✍️ Drög að svari</div><textarea class="pv-drog" id="pv-drog">' + esc(r.drog || '') + '</textarea>' +
      '<div class="pv-row"><button class="pv-act" id="pv-cpy">📋 Afrita svar</button>' +
      '<a class="pv-act" href="' + mailto + '">✉️ Opna í pósti</a></div>' +
      '<div class="pv-l">📎 Skjöl í viðhengi <span class="pv-mut">(einn hlekkur í línu, má hafa „Nafn — https://…“)</span></div>' +
      '<textarea id="pv-skjol" style="min-height:52px">' + esc(r.skjol || '') + '</textarea>' +
      '<div class="pv-att" id="pv-attprev">' + links(r.skjol) + '</div>' +
      '<div class="pv-l">Athugasemd</div><textarea id="pv-ath" style="min-height:40px">' + esc(r.athugasemd || '') + '</textarea>' +
      '<div class="pv-row"><span class="pv-l" style="margin:0">Staða:</span><div class="pv-stbtns">' +
      '<button class="r' + (r.status === 'ósvarað' ? ' on' : '') + '" data-ps="ósvarað">Ósvarað</button>' +
      '<button class="bl' + (r.status === 'tilbuid' ? ' on' : '') + '" data-ps="tilbuid">Tilbúið</button>' +
      '<button class="g' + (r.status === 'klarad' ? ' on' : '') + '" data-ps="klarad">Klárað</button>' +
      '</div></div>' +
      '<div class="pv-row"><button class="pv-save" id="pv-save">💾 Vista</button><span class="pv-st" id="pv-savest"></span></div>';
  }

  // ── TEXTAVÖRN (09.09.2026, ósk Agnars: „enginn texti má nokkurntíma tínast") ──
  // Þrír textareitar hanga hér: DRÖG AÐ SVARI (heilt svarbréf), SKJÖL og
  // ATHUGASEMD. Áður vistuðust þeir AÐEINS þegar smellt var á 💾 Vista.
  // Mælt 09.09.2026: hver einasta endurteikning (`renderPanel`) byggir
  // `detailH()` upp úr DATA — sem veit ekkert um óvistaðan innslátt. Því dugði
  //   • smellur á stöðutakka (Ósvarað/Tilbúið/Klárað)  → renderPanel()
  //   • smellur á annað erindi í listanum               → renderPanel()
  //   • smellur á síu-flipa                             → renderPanel()
  // til að ÞURRKA ÚT fullskrifað svarbréf, þegjandi og án viðvörunar.
  // Úrbætur, sama fyrirmynd og `savePlanNote` í 153-arsskodun.js:
  //   1. `uppskera()` les reitina í minnisröðina ÁÐUR en nokkuð er teiknað upp.
  //   2. EITT vistunarfall (`vistaNu`) sem debounce, blur OG Vista-takkinn nota.
  //   3. Villa er SÝNILEG (rauð útlína + texti + logProblem) — aldrei þögul.
  //   4. `beforeunload` stöðvar flakk á meðan óvistað efni situr í reitunum.
  var VIST_MS = 700;
  var vistTimer = null;
  var oskilad = false;          // er eitthvað óvistað í reitunum núna?

  function reitir() {
    return {
      drog: document.getElementById('pv-drog'),
      skjol: document.getElementById('pv-skjol'),
      athugasemd: document.getElementById('pv-ath')
    };
  }
  // Færa það sem stendur í reitunum yfir í minnisröðina. VERÐUR að keyra á
  // undan hverri endurteikningu, annars les detailH() gamla gildið og textinn
  // sem notandinn var að skrifa hverfur.
  function uppskera() {
    var r = DATA.find(function (x) { return x.id === curId; });
    if (!r) return null;
    var e = reitir();
    if (e.drog) r.drog = e.drog.value;
    if (e.skjol) r.skjol = e.skjol.value;
    if (e.athugasemd) r.athugasemd = e.athugasemd.value;
    return r;
  }

  function stada(txt, villa) {
    var st = document.getElementById('pv-savest');
    if (!st) return;
    st.textContent = txt;
    st.style.color = villa ? '#dc2626' : '';
    st.style.fontWeight = villa ? '700' : '';
  }
  function merkjaVillu(a) {
    var e = reitir();
    ['drog', 'skjol', 'athugasemd'].forEach(function (k) {
      if (!e[k]) return;
      e[k].style.outline = a ? '2px solid #dc2626' : '';
      e[k].title = a ? 'Textinn vistaðist EKKI — hann er enn hér, reyndu aftur.' : '';
    });
  }

  // Eina vistunarleiðin. Skilar true/false; hendir ALDREI textanum úr reitnum.
  async function vistaNu(þögul) {
    clearTimeout(vistTimer); vistTimer = null;
    var r = uppskera();
    if (!r) return false;
    var id = r.id;
    var patch = {
      drog: r.drog || '', skjol: r.skjol || '', athugasemd: r.athugasemd || '',
      status: r.status, updated_at: new Date().toISOString()
    };
    // Óbreytt frá síðustu staðfestu vistun → sleppa (enginn óþarfa skrifgangur).
    var far = JSON.stringify([patch.drog, patch.skjol, patch.athugasemd, patch.status]);
    if (r._vistad === far) { oskilad = false; return true; }
    if (!þögul) stada('Vista…');
    var q;
    try {
      if (!window.DB || !window.DB.sb) throw new Error('Engin gagnagrunnstenging');
      q = await window.DB.sb.from('cowork_postsvor').update(patch).eq('id', id);
      // supabase-js KASTAR EKKI — villan kemur til baka í .error. Án þessarar
      // athugunar leit misheppnuð vistun út eins og hún hefði tekist.
      if (q && q.error) throw q.error;
    } catch (err) {
      oskilad = true;
      merkjaVillu(true);
      stada('⚠ Vistaðist EKKI: ' + ((err && err.message) || err) + ' — textinn er enn hér', true);
      try { if (window.logProblem) window.logProblem('postar_queue_save_failed', 'id ' + id + ' — ' + ((err && err.message) || err)); } catch (_) {}
      return false;
    }
    r._vistad = far;
    oskilad = false;
    merkjaVillu(false);
    if (!þögul) stada('✓ Vistað ' + new Date().toLocaleTimeString('is-IS'));
    return true;
  }

  function wireDetail() {
    var d = document.getElementById('pv-detail'); if (!d) return;
    var e = reitir();
    var r = DATA.find(function (x) { return x.id === curId; });
    if (r && r._vistad === undefined) {
      r._vistad = JSON.stringify([r.drog || '', r.skjol || '', r.athugasemd || '', r.status]);
    }
    // Sjálfvirk vistun á öllum þremur reitunum: debounce við innslátt OG
    // tafarlaus vistun við blur. Blur-leiðin er sú sem bjargar textanum þegar
    // notandinn fer STRAX úr reitnum — debounce-tíminn nær þá aldrei að renna.
    ['drog', 'skjol', 'athugasemd'].forEach(function (k) {
      var el = e[k]; if (!el) return;
      el.addEventListener('input', function () {
        oskilad = true;
        merkjaVillu(false);
        if (k === 'skjol') {
          var pv = document.getElementById('pv-attprev');
          if (pv) pv.innerHTML = links(el.value);
        }
        clearTimeout(vistTimer);
        vistTimer = setTimeout(function () { vistaNu(true); }, VIST_MS);
      });
      el.addEventListener('blur', function () { vistaNu(true); });
    });
    var cpy = document.getElementById('pv-cpy');
    if (cpy) cpy.addEventListener('click', function () {
      var t = document.getElementById('pv-drog').value;
      navigator.clipboard.writeText(t);
      stada('✓ Afritað');
      setTimeout(function () { stada(''); }, 1500);
    });
    d.querySelectorAll('.pv-stbtns button').forEach(function (b) {
      b.addEventListener('click', async function () {
        // Uppskera FYRST — annars henti endurteikningin á eftir öllu sem var
        // skrifað í reitina síðan síðast var vistað.
        var row = uppskera();
        if (row) row.status = b.getAttribute('data-ps');
        await vistaNu(false);
        renderPanel();
      });
    });
    var sv = document.getElementById('pv-save');
    if (sv) sv.addEventListener('click', saveCur);
  }

  async function saveCur() {
    var ok = await vistaNu(false);
    if (ok) renderPanel();
  }

  // Síðasta vörnin: loka/endurhlaða vafraglugga með óvistað svarbréf í reitnum.
  window.addEventListener('beforeunload', function (ev) {
    if (!active || !oskilad) return;
    uppskera();
    vistaNu(true);                       // reynum enn (fer oft í gegn)
    ev.preventDefault(); ev.returnValue = '';
    return '';
  });

  async function activate() {
    css();
    active = true;
    styleChip(true);
    var host = document.getElementById('vb-list');
    if (host) host.innerHTML = '<div class="pv-mut" style="padding:24px">Sæki pósta…</div>';
    var r = await window.DB.sb.from('cowork_postsvor').select('*');
    if (r.error) { if (host) host.innerHTML = '<div class="pv-mut" style="padding:24px">Villa: ' + esc(r.error.message) + '</div>'; return; }
    DATA = (r.data || []).sort(function (a, b) {
      return (a.forgangur || 9) - (b.forgangur || 9) ||
        ('' + (b.updated_at || '')).localeCompare('' + (a.updated_at || ''));
    });
    if (curId == null) { var f = DATA.filter(pass)[0]; curId = f ? f.id : null; }
    renderPanel();
  }

  function selStyle() {
    var c = [].slice.call(document.querySelectorAll('[data-act="queue"]'))
      .filter(function (x) { return /gradient/.test(x.getAttribute('style') || ''); })[0];
    return c ? c.getAttribute('style') : '';
  }
  function unselStyle() {
    var c = [].slice.call(document.querySelectorAll('[data-act="queue"]'))
      .filter(function (x) { return !/gradient/.test(x.getAttribute('style') || ''); })[0];
    return c ? c.getAttribute('style') : '';
  }
  function styleChip(on) {
    var me = document.getElementById(CHIP_ID);
    if (!me) return;
    me.setAttribute('style', (on ? ACTIVE_STYLE : INACTIVE_STYLE) || me.getAttribute('style'));
  }

  function injectChip() {
    if (window.Verkbord && Verkbord.showOwnerChrome && !Verkbord.showOwnerChrome()) {
      var me = document.getElementById(CHIP_ID);
      if (me && me.parentNode) me.parentNode.removeChild(me);
      return;
    }
    var native = document.querySelector('[data-act="queue"]');
    if (!native) return;
    if (!ACTIVE_STYLE) { ACTIVE_STYLE = selStyle(); INACTIVE_STYLE = unselStyle(); }
    if (document.getElementById(CHIP_ID)) return;
    var chip = native.cloneNode(false);
    ['data-act', 'data-q'].forEach(function (a) { chip.removeAttribute(a); });
    chip.id = CHIP_ID;
    chip.setAttribute('style', INACTIVE_STYLE || native.getAttribute('style'));
    chip.textContent = '📨 Póstar';
    chip.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); activate(); });
    native.parentElement.appendChild(chip);
  }

  // Deactivate my chip when a native queue chip is chosen (the app re-renders #vb-list itself).
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-act="queue"]');
    if (!t) return;
    // 09.09.2026: appið skiptir sjálft út #vb-list hérna — reitirnir hverfa úr
    // DOM-inu í sama tikki. Vista áður en þeir gufa upp (capture-fasi, svo
    // þetta gerist á undan endurteikningu appsins).
    if (active && oskilad) { try { vistaNu(true); } catch (_) {} }
    active = false; setTimeout(function () { styleChip(false); }, 0);
  }, true);

  var obs = new MutationObserver(function () {
    injectChip();
    if (active) styleChip(true);
  });
  function tick() {
    injectChip();
    if (active) styleChip(true);
  }
  function boot() {
    try { obs.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    tick();
    // Bulletproof fallback: the app renders/re-renders the Þjónustuborð toolbar on
    // route changes; a light idempotent poll guarantees the chip is (re)inserted
    // regardless of MutationObserver timing. injectChip() is a no-op once present.
    setInterval(tick, 800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
