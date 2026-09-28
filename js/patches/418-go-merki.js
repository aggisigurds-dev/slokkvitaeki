/* === GÓ-MERKI v1 ===================================================
 *
 * Agnar 28.09.2026: „Mig vantar eiginlega einn merkingarlið Colomn í viðbót,
 * með hálfgegnsæju merki fyrst sem maður getur síðan flétt á milli nokkra
 * merkja" · „skýrðu colomn GÓ" · „Grænn glóandi punktur, blár glóandi punktur,
 * bleikur glóandi punktur, gulur glóandi punktur, rauður glóandi punktur" ·
 * „síðan úr rauður aftur í semi ósýnilegt".
 *
 * Sjálfstæður merkingardálkur í Ársskoðun, á milli Forg. og Stöðu. Sex stöður:
 *
 *     0  ósett — hálfgegnsær hringur
 *     1  grænn · 2  blár · 3  bleikur · 4  gulur · 5  rauður   (glóandi)
 *     → og úr rauðum aftur í ósett.
 *
 * MERKINGIN ER AGNARS. Kóðinn leggur enga þýðingu í litina og á ekki að gera
 * það; þeir eru vinnumerki sem hann raðar sjálfur. Þess vegna eru engir
 * texta-labels hér — aðeins liturinn og talan.
 *
 * Byggt EINS og 175 (Forgangur), viljandi:
 *   • bjartsýn málun strax, vistun með 1 s töf (margir smellir → eitt skrif)
 *   • ÞRÖNGT patch — aðeins breyttu lyklarnir fara með, annars rúlla
 *     breytingar hinna vélanna til baka (sama gildra og 175 lenti í)
 *   • einn document-delegati svo takkinn virki í hvaða sýn sem er
 *   • skrifin tæmd við visibilitychange/pagehide svo töfin tapi engu
 *
 * Geymt Á ÞJÓNINUM (app_settings → `ars_go_merki`), ekki í localStorage:
 * þetta er staða gagna sem fjórar vélar deila, og CLAUDE.md-reglan um það
 * er afdráttarlaus. Sjá [Samstillt milli véla].
 *
 * API:  GoMerki.get(coId) · .cycle(coId) · .btnHtml(coId, sz?) · .of(coId)
 *       Viðburður: 'go-merki-changed' { coId, old, new, pending }
 * ==================================================================== */
(() => {
  if (window.GoMerki && window.GoMerki._installed) return;

  const STORAGE_KEY = 'ars_go_merki';

  //                ósett      grænn      blár       bleikur    gulur      rauður
  const COLORS = ['#94a3b8', '#22c55e', '#3b82f6', '#ec4899', '#eab308', '#ef4444'];
  const N = COLORS.length;                     // 6 — hringurinn lokast á ósett
  const SAVE_DELAY = 1000;

  const _pending = {};
  let _saveTimer = null;

  function _getMap() {
    try {
      return (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
    } catch (_) { return {}; }
  }
  function get(coId) {
    const k = String(coId);
    if (Object.prototype.hasOwnProperty.call(_pending, k)) return +_pending[k] || 0;
    const v = +_getMap()[k] || 0;
    return (v >= 0 && v < N) ? v : 0;
  }
  const of = get;                              // röðun í 153 les þetta
  function colorOf(n) { return COLORS[n | 0] || COLORS[0]; }

  // Snertiskjár: 18 px hnappur er langt undir lágmarki (sama úttekt og í 175).
  const TOUCH = (typeof matchMedia === 'function') && matchMedia('(pointer:coarse)').matches;

  // !important á hverri sjónrænni yfirlýsingu — ekki af kæruleysi. Þemað málar
  // ALLA <button> með málmhalla og svörtum ramma gegnum reglu sem `matches()`
  // nær ekki að meta (leitað 28.09, fannst ekki í neinu stílblaði). Mælt á
  // lifandi síðu: innlínu-stíllinn stóð réttur (`background:#3b82f6`) en
  // reiknaða gildið var `linear-gradient(#3d4048,#1c1e23)` — punkturinn var
  // málmhnappur, ekki glóandi punktur. Innlína MEÐ !important er efst í
  // stigveldinu og endar þann slag án þess að elta uppi regluna.
  // Sjá [CSS override specificity].
  function _style(n, sz) {
    const c = colorOf(n);
    const G = '!important';
    const grunn = 'width:' + sz + 'px' + G + ';height:' + sz + 'px' + G +
      ';border-radius:50%' + G + ';box-sizing:border-box' + G +
      ';background-image:none' + G + ';';
    return n === 0
      // Ósett: hálfgegnsær hringur — sést að reiturinn er til, án þess að trana sér fram.
      ? grunn + 'border:1.5px solid ' + c + G + ';background-color:transparent' + G +
        ';opacity:.35' + G + ';box-shadow:none' + G
      // Glóandi: fylltur punktur með tveimur lögum af ljóma.
      : grunn + 'border:1.5px solid ' + c + G + ';background-color:' + c + G +
        ';opacity:1' + G +
        ';box-shadow:0 0 4px ' + c + ',0 0 9px ' + c + '66,inset 0 1px 1px rgba(255,255,255,.55)' + G;
  }

  function btnHtml(coId, sz) {
    sz = +sz || 16;
    if (TOUCH && sz < 28) sz = 28;
    const n = get(coId);
    return '<button class="_go-btn" data-co-id="' + coId + '" data-go="' + n + '" type="button" ' +
      'aria-label="GÓ-merki" title="GÓ — smelltu til að fletta merkinu" ' +
      'style="display:inline-block;padding:0;cursor:pointer;flex-shrink:0;' +
        'transition:background-color .15s ease-out,box-shadow .15s ease-out,opacity .15s ease-out,transform .12s ease-out;' +
        _style(n, sz) + '"' +
      ' onmouseover="this.style.transform=\'scale(1.25)\'" onmouseout="this.style.transform=\'scale(1)\'"></button>';
  }

  // Hver coId getur átt marga takka á skjánum í einu (listi + kort + gluggi).
  function _paint(coId) {
    const n = get(coId);
    const sel = '._go-btn[data-co-id="' + (window.CSS && CSS.escape ? CSS.escape(String(coId)) : coId) + '"]';
    document.querySelectorAll(sel).forEach(b => {
      b.dataset.go = n;
      // Stærðin sem takkinn var teiknaður með helst — les hana af honum sjálfum.
      const sz = Math.round(b.getBoundingClientRect().width) || (TOUCH ? 28 : 16);
      const t = b.style.transform;
      b.setAttribute('style',
        'display:inline-block;padding:0;cursor:pointer;flex-shrink:0;' +
        'transition:background-color .15s ease-out,box-shadow .15s ease-out,opacity .15s ease-out,transform .12s ease-out;' +
        _style(n, sz) + (t ? ';transform:' + t : ''));
    });
  }

  function _scheduleSave() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_flush, SAVE_DELAY);
  }

  async function _flush() {
    _saveTimer = null;
    const snapshot = Object.assign({}, _pending);
    const keys = Object.keys(snapshot);
    if (!keys.length) return;
    if (!(window.AppSettings && window.AppSettings.save)) { _scheduleSave(); return; }

    // ÞRÖNGT patch: aðeins lyklarnir sem breyttust. Færi öll varpan með myndi
    // hún yfirskrifa merkingar hinna vélanna sem lentu á meðan (175, lína 120).
    const merged = {};
    keys.forEach(k => { merged[k] = snapshot[k]; });

    let ok = false;
    try { ok = await window.AppSettings.save({ [STORAGE_KEY]: merged }); }
    catch (_) { ok = false; }

    if (ok) {
      keys.forEach(k => { if (_pending[k] === snapshot[k]) delete _pending[k]; });
    } else {
      // Þögul mistök = merking sem starfsmaðurinn heldur að sé komin. Segja frá.
      try { if (window.Toast && Toast.show) Toast.show('GÓ-merki: vistun mistókst — reyni aftur.'); } catch (_) {}
      _scheduleSave();
    }
  }

  function cycle(coId) {
    const k = String(coId);
    const cur = get(k);
    const next = (cur + 1) % N;        // … rauður → ósett
    _pending[k] = next;
    _paint(k);
    document.dispatchEvent(new CustomEvent('go-merki-changed', {
      detail: { coId: k, old: cur, new: next, pending: true }
    }));
    _scheduleSave();
    return next;
  }

  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('._go-btn');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const coId = b.dataset.coId;
    if (coId) cycle(coId);
  }, true);

  function _flushNow() { if (_saveTimer) { clearTimeout(_saveTimer); _flush(); } }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') _flushNow(); });
  window.addEventListener('pagehide', _flushNow);

  window.GoMerki = { _installed: true, get, of, cycle, btnHtml, colorOf, COLORS, N };
})();
