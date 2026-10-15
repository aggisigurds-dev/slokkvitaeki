/* === 470 · Skoðunarmánuður BRUNAKERFIS í „Staða eftir ári"-hausnum (15.10.2026) =====================================
 *
 * Agnar 15.10.2026: „vantar að geta sett Staða eftir ári skoðunarmánuð fyrir brunakerfishlutann sérstaklega, oft
 * sitthvor mánuðurinn … og það sé syncanlegt milli þeirra staðsetninga sem sýnir mánuðinn".
 *
 * Flísin „SKOÐUN Júlí ✎" í hausnum er skoðunarmánuður SLÖKKVITÆKJA (199 teiknar .sk-month-pill, 403 færir hana í
 * .b403-arrod og klæðir í .b403-manudur; vistast í arsskodun_customers). Brunakerfisþjónustan á SÉR mánuð sem er þegar
 * til í gögnunum: AppSettings.brunakerfi_customers[fid].inspect_month (1–12) — sami lykill og 147 (Brunakerfisþjónusta),
 * 151 (innlestur), 388 (Brunakerfis skoðun → vista()) skrifa í og 158/388 lesa úr. Hér er EKKI ný geymsla: flísin les
 * þann lykil og skrifar hann með AppSettings.save eins og 388 vista() gerir (einn lykill, eitt félag, lesið til baka).
 *
 * Birting: aðeins þegar félagið er á áskriftarlista brunakerfa (lykill til í kortinu — líka eldra `true`-sniðið, sbr.
 * 388). Flísin fer BEINT Á EFTIR slökkvitækjaflísinni, með sama útliti: í Brunastál (403 búið að raða) fær hún sama
 * klasa .b403-manudur með línutákni (logi) í stað dagatals; annars (sími/app, 199 óbreytt) .sk-month-pill með 🔥.
 * Slökkvitækjaflísin sjálf er ósnert.
 *
 * Stöðugt viðmót: hér er ENGIN endurteikning með innerHTML á íláti — einn hnútur er settur inn / uppfærður á staðnum,
 * aðeins þegar gildið eða samhengið breyttist. 403 raðar section-inu upp á nýtt eftir hverja 199-teikningu; hnúturinn
 * er því aldrei settur inn fyrr en .b403-root er komið (annars lenti hann í „Annað"-kaflanum hjá 403).
 * ================================================================================================================== */
(function () {
  if (window.__bkManudur470) return;
  window.__bkManudur470 = true;

  var KEY = 'brunakerfi_customers';
  var MANUDIR = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  var MAN_STUTT = ['Jan', 'Feb', 'Mar', 'Apr', 'Maí', 'Jún', 'Júl', 'Ágú', 'Sep', 'Okt', 'Nóv', 'Des'];
  var MAN_FULL = ['Janúar', 'Febrúar', 'Mars', 'Apríl', 'Maí', 'Júní', 'Júlí', 'Ágúst', 'September', 'Október', 'Nóvember', 'Desember'];

  // Sömu línutákn og 403 (stroke-SVG), loginn í stærð dagatalsins.
  function svg(d, w, sz) {
    return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  var ICON_FLAME = svg('<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-3-8 0 4-5 6-5 12 0 4 3 7 7 7z"/>', 2, 14);
  var ICON_PEN = svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', 2, 13);

  // ── lestur: áskriftarkortið (hlutur EÐA eldra `true`) og mánuðurinn ──
  function kort(fid) {
    var AS = window.AppSettings;
    if (!AS || !AS.path) return null;
    var m = AS.path(KEY) || {};
    var v = m[String(fid)];
    if (!v) return null;
    return typeof v === 'object' ? v : { co_id: +fid };
  }
  function manudur(fid) {
    var k = kort(fid);
    var m = k ? (+k.inspect_month || 0) : 0;
    return (m >= 1 && m <= 12) ? m : 0;
  }

  // ── skrif: nákvæmlega eins og 388 vista() — einn lykill, eitt félag, lesið til baka ──
  async function vista(fid, m) {
    var AS = window.AppSettings;
    if (!AS || !AS.save || !AS.path) return { ok: false, villa: 'Stillingageymslan (AppSettings) er ekki hlaðin' };
    var fyrir = (AS.path(KEY) || {})[String(fid)];
    if (!fyrir) return { ok: false, villa: 'Fyrirtækið er ekki á áskriftarlista brunakerfa — bættu því við í „Brunakerfisþjónusta" fyrst' };
    var sent = { inspect_month: +m || 0 };
    // Eldra `true`-snið: skrifið þarf að reisa hlutinn, annars félli djúp-sameiningin og staðfestingin (sbr. 388).
    if (typeof fyrir !== 'object') sent.co_id = +fid;
    var patch = {}; patch[String(fid)] = sent;
    var save = {}; save[KEY] = patch;
    var svar = await AS.save(save);
    if (svar === false) return { ok: false, villa: 'Vistun stillinga mistókst (save skilaði false)' };
    var nu = (AS.path(KEY) || {})[String(fid)] || {};
    var stemmir = String(nu.inspect_month == null ? '' : nu.inspect_month) === String(sent.inspect_month);
    if (!stemmir) { try { console.warn('[470] vistun stemmdi ekki', { fid: fid, sent: sent, nu: nu }); } catch (_) {} }
    return stemmir ? { ok: true } : { ok: false, villa: 'Gildið í stillingunum stemmir ekki við það sem var sent' };
  }

  // ── samhengi: er 403 búið að raða (Brunastál, tölva) eða á 199-útlitið við? ──
  function i403(section) { return !!section.querySelector('.b403-root'); }
  function bidur403(section) {
    // 403 keyrir aðeins í þessu gildissviði (sjá scope() þar); innan þess bíðum við eftir .b403-root.
    if (!window.__skjol403) return false;
    var h = document.documentElement;
    var scope = h.getAttribute('data-thm-preset') === 'brunastal' && h.getAttribute('data-viewmode') !== 'mobile' && !h.classList.contains('slokk-phone-dev') && !document.body.classList.contains('appmode');
    if (!scope) return false;
    if (section.dataset.b403fail === '1') return false;
    return !i403(section);
  }

  // ── flísin sjálf: uppfærð á staðnum, aðeins þegar eitthvað breyttist ──
  function teikna(btn, fid, stal) {
    var m = manudur(fid);
    if (btn._fid === fid && btn._m === m && btn._stal === stal) return;
    btn._fid = fid; btn._m = m; btn._stal = stal;
    btn.className = 'b470-bk ' + (stal ? 'b403-manudur' : 'sk-month-pill') + (m ? '' : ' empty');
    btn.title = m
      ? 'Skoðunarmánuður brunakerfis — ' + MAN_FULL[m - 1] + ' — smelltu til að breyta (sami mánuður og í Brunakerfis skoðun)'
      : 'Enginn skoðunarmánuður brunakerfis skráður — smelltu til að setja';
    if (stal) btn.innerHTML = ICON_FLAME + '<span class="mlabel">Brunakerfi</span><b>' + (m ? MANUDIR[m - 1] : '—') + '</b>' + ICON_PEN;
    else btn.textContent = '🔥 Brunakerfi ' + (m ? MAN_STUTT[m - 1] : '—');
  }

  function tryggja() {
    var main = document.getElementById('companies-main'); if (!main) return;
    var section = main.querySelector('._dyg-section'); if (!section) return;
    if (section.querySelector('select[data-bk-month-sel]')) return;   // valið er opið — ekki hrófla
    var fid = +section.dataset.coId; if (!fid) return;
    var pill = section.querySelector('.sk-month-pill:not(.b470-bk)');   // slökkvitækjaflísin (199/403)
    var minn = section.querySelector('.b470-bk');
    if (!pill || !kort(fid) || bidur403(section)) { if (minn) minn.remove(); return; }
    if (!minn) {
      minn = document.createElement('button');
      minn.type = 'button';
      minn.setAttribute('data-bk-month-edit', '1');
      pill.after(minn);
    } else if (minn.previousElementSibling !== pill) {
      pill.after(minn);
    }
    teikna(minn, fid, i403(section));
  }

  // ── mánaðarval: sama innfellda <select> og 199 notar fyrir slökkvitækjaflísina ──
  function opnaVal(btn) {
    var section = btn.closest('._dyg-section'); if (!section) return;
    var fid = +section.dataset.coId; if (!fid) return;
    if (section.querySelector('select[data-bk-month-sel]')) return;
    var cur = manudur(fid);
    var sel = document.createElement('select');
    sel.setAttribute('data-bk-month-sel', '1');
    sel.title = 'Skoðunarmánuður brunakerfis';
    sel.style.cssText = 'min-height:30px;padding:3px 8px;border:2px solid #6366f1;border-radius:8px;font:inherit;font-size:12px;background:var(--surface);color:var(--ink1);outline:none;cursor:pointer';
    var opts = '<option value="0"' + (cur === 0 ? ' selected' : '') + '>— enginn —</option>';
    MAN_FULL.forEach(function (n, i) { opts += '<option value="' + (i + 1) + '"' + (cur === i + 1 ? ' selected' : '') + '>' + n + '</option>'; });
    sel.innerHTML = opts;
    btn.replaceWith(sel);
    sel.focus();
    var done = false;
    function aftur() {
      if (sel.parentNode) sel.replaceWith(btn);
      tryggja();
    }
    function haetta() { if (done) return; done = true; aftur(); }
    sel.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); haetta(); } });
    sel.addEventListener('blur', function () { setTimeout(haetta, 150); });
    sel.addEventListener('change', async function () {
      if (done) return; done = true;
      var v = parseInt(sel.value, 10) || 0;
      sel.disabled = true;
      var r;
      try { r = await vista(fid, v); } catch (e) { r = { ok: false, villa: (e && e.message) || String(e) }; }
      aftur();
      if (!r.ok) { alert('Vista mistókst: ' + r.villa); return; }
      // 388/385 lesa sama lykil úr AppSettings við næstu sókn (listinn cachear raðir í 60 s).
      try { document.dispatchEvent(new CustomEvent('brunakerfi-month-changed', { detail: { fid: fid, month: v } })); } catch (_) {}
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('.b470-bk[data-bk-month-edit]');
    if (!btn) return;
    e.preventDefault();
    opnaVal(btn);
  });

  // ── vakt: sama tif og 403 (rAF-laus, keyrir inni í MutationObserver-svarinu), ódýrt í kyrrstöðu ──
  function schedule() { if (schedule.inni) return; schedule.inni = true; try { tryggja(); } catch (err) { console.error('[470]', err); } finally { schedule.inni = false; } }
  (function watch() {
    var main = document.getElementById('companies-main');
    if (!main) { setTimeout(watch, 700); return; }
    new MutationObserver(schedule).observe(main, { childList: true, subtree: true });
    setInterval(schedule, 1500);   // öryggispúls: AppSettings getur lent eftir síðustu DOM-breytingu
    schedule();
  })();
  (function bidaAS() {
    var AS = window.AppSettings;
    if (!AS || !AS.onChange) { setTimeout(bidaAS, 500); return; }
    AS.onChange(schedule);   // annar skjár/388 breytti mánuðinum → flísin fylgir
  })();

  console.log('[patch-470] Brunakerfi-skoðunarmánuður á prófíl installed');
})();
/* === END 470 === */
