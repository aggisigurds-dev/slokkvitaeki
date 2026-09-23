/* === 403 · Skjöl & viðhengi — spjaldið úr hönnuninni (23.09.2026) ===
 *
 * Hönnun B af Design-striganum (samþykkt 23.09): málmhaus með talningu „N skjöl vantar" og stiku
 * Komin · Í vinnslu · Vantar; ársplötur; samningsröð; hvert ár sem málmband með þremur
 * þjónustuspjöldum (málmhaus: tákn · nafn · brot · stimpill · Senda · ⋯); tvær skjalalínur
 * (Skýrsla / Reikningur) með skjalinu sjálfu sem opnunartakka, stöðuplötu og ⋯; skil fyrir
 * skjal sem vantar; Önnur viðhengi og Hreyfingar sem kaflar.
 *
 * ENGIN GÖGN ERU SÓTT HÉR OG ENGIN HANDLER SKRIFAÐUR: 199 teiknar spjaldið eins og áður og þessi
 * patch RAÐAR úttaki þess upp á nýtt. Hver einasti upprunalegi hnappur, hlekkur, reitur og
 * gátreitur er FÆRÐUR (aldrei klónaður, aldrei fjarlægður) inn í nýja uppröðun — 199 hlustar á
 * section-inu (wire) og document, svo tengingarnar halda. Það sem hönnunin felur í ⋯ er sett
 * inn í valmyndina sem sýnilegur liður sem SMELLIR á upprunalega hnappinn (sem stendur inni í
 * liðnum, ósýnilegur en í DOM). Það sem uppröðunin þekkir ekki fer óbreytt í „Annað" neðst —
 * ekkert er falið án staðgengils.
 *
 * Öryggisnet: fyrir og eftir hverja uppröðun eru gagnvirku hnútarnir taldir (button, a[href],
 * input, select, textarea). Fækki þeim er uppröðunin dregin til baka (199 endurteiknar) og villa
 * skráð í console — spjaldið birtist þá eins og 199 skilar því.
 *
 * Endurteikningar: 199 skrifar section.innerHTML við hverja render (og eftir customer-doc-written,
 * visibilitychange, MutationObserver á #companies-main). Uppröðunin keyrir aftur í hvert sinn sem
 * .b403-root vantar en .sk-yrwrap er komið (Hleð… ástandið er látið í friði).
 *
 * Gildissvið: Brunastál (frosið), tölva. Sími/app (338/356) fá 199 eins og áður.
 */
(function () {
  if (window.__skjol403) return;
  window.__skjol403 = true;

  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  var DISPLAY = '"Playfair Display",Georgia,serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var METAL_BTN = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  var SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  var PLATE_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  var INNER_IMG = 'linear-gradient(180deg,rgba(255,255,255,.9),rgba(20,30,60,.05)),repeating-linear-gradient(108deg,rgba(255,255,255,.5) 0 1px,transparent 1px 4px)';
  var SAEKJA = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  var BSTAL = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';
  var GULL = 'linear-gradient(145deg,#171001 0%,#3d2b05 20%,#8a6410 43%,#d3ab4e 53%,#5a3f07 74%,#171001 100%)';
  var RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';

  var MANUDIR = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  var MAN_STUTT = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];

  // ── tákn (inline stroke-SVG, sama sett og hönnunin) ──
  function svg(d, w, sz) {
    return '<svg width="' + (sz || 16) + '" height="' + (sz || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  var ICON = {
    dots: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    doc: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>'),
    inv: svg('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
    samn: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8 17c1-2 2-2 3 0s2 2 3 0"/>', 2, 18),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 2.5, 14),
    send: svg('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
    open: svg('<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>'),
    trash: svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>'),
    cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>', 2, 14),
    pen: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', 2, 13),
    ext: svg('<rect x="8" y="7" width="8" height="14" rx="3"/><path d="M12 7V4M9 4h6"/><path d="M8 10 4 8"/>', 2, 18),
    flame: svg('<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-3-8 0 4-5 6-5 12 0 4 3 7 7 7z"/>', 2, 18),
    drop: svg('<path d="M12 3v4M8 7h8"/><path d="M12 7c-4 4-6 7-6 10a6 6 0 0 0 12 0c0-3-2-6-6-10z"/>', 2, 18),
    down: svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 19h16"/>'),
    check: svg('<path d="m5 12 5 5L20 7"/>', 3, 14)
  };

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function txt(e) { return String((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function stripEmoji(s) { return String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}✅❌️]/gu, '').replace(/^[\s·]+|[\s·]+$/g, '').trim(); }
  // Skjala-chippin bera emoji-tákn fremst (📄 🧯 🧾 📑) — hönnunin sýnir SVG-tákn í staðinn. Textahnútur einn, handlerar lesa attribút.
  function deEmoji(k) { if (k && k.classList && k.classList.contains('sk-doc') && !k.children.length) k.textContent = stripEmoji(txt(k)); return k; }
  function svcIcon(label) {
    var l = String(label || '').toLowerCase();
    if (/brunakerfi/.test(l)) return ICON.flame;
    if (/sl(ö|o)kkvikerfi/.test(l)) return ICON.drop;
    return ICON.ext;
  }
  function interactive(root) { return root.querySelectorAll('button,a[href],input,select,textarea,[data-pick],[data-att],[data-deldoc],[data-del],[data-invopen],[data-filled],[data-dfc],[data-month-edit],[data-add-yr-svc],[data-open-bkc],[data-open-slk],[data-link-sel],[data-link-peek],[data-link-save],.sk-doc.rep.miss').length; }

  // ⋯ valmynd: liðir eru sýnilegir takkar sem smella á upprunalega hnútinn (sem situr inni í liðnum).
  function menuButton(items, label) {
    var wrap = el('span', 'b403-vm');
    var btn = el('button', 'b403-meira', ICON.dots);
    btn.type = 'button'; btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', label || 'Fleiri aðgerðir'); btn.title = label || 'Fleiri aðgerðir';
    var menu = el('div', 'b403-menu'); menu.setAttribute('role', 'menu'); menu.hidden = true;
    items.forEach(function (it) {
      if (it === 'skil') { menu.appendChild(el('div', 'b403-skil')); return; }
      var mi = el('button', 'b403-mi' + (it.danger ? ' eyda' : ''));
      mi.type = 'button'; mi.setAttribute('role', 'menuitem');
      mi.innerHTML = (it.icon || '') + '<span>' + it.label + '</span>';
      var orig = it.orig; orig.classList.add('b403-orig'); mi.appendChild(orig);
      mi.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation(); closeAll();
        orig.click();
      });
      menu.appendChild(mi);
    });
    wrap.appendChild(btn); wrap.appendChild(menu);
    btn.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      var open = !menu.hidden; closeAll();
      if (!open) { menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.classList.add('opin'); placeMenu(btn, menu); }
    });
    return wrap;
  }
  function placeMenu(btn, menu) {
    var r = btn.getBoundingClientRect();
    menu.style.top = (r.bottom + 4) + 'px';
    var left = r.right - menu.offsetWidth; if (left < 8) left = 8;
    menu.style.left = left + 'px';
    if (r.bottom + 4 + menu.offsetHeight > window.innerHeight - 8) menu.style.top = Math.max(8, r.top - 4 - menu.offsetHeight) + 'px';
  }
  function closeAll() {
    document.querySelectorAll('.b403-menu:not([hidden])').forEach(function (m) { m.hidden = true; });
    document.querySelectorAll('.b403-meira.opin').forEach(function (b) { b.classList.remove('opin'); b.setAttribute('aria-expanded', 'false'); });
  }
  document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.b403-vm')) closeAll(); }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  window.addEventListener('scroll', closeAll, true);

  // „+ skýrsla" / „vantar reikning" / „＋" → skýr sögn; handlerinn les data-kind/data-year, ekki textann.
  function addLabel(b) {
    var k = b.getAttribute('data-kind') || '';
    b.textContent = k === 'skyrsla' ? 'Bæta við skýrslu' : k === 'reikningur' ? 'Bæta við reikningi' : k === 'samningur' ? 'Bæta við samningi' : 'Bæta við skjali';
  }
  function plata(text, state) { return el('span', 'b403-plata ' + (state || ''), '<i aria-hidden="true"></i>' + text); }

  // ── ein skjalalína (Skýrsla / Reikningur) úr .sk-svc-row ──
  function composeRow(row, labelText) {
    var line = el('div', 'b403-rod');
    var lbl = el('span', 'b403-lbl', labelText); line.appendChild(lbl);
    var val = el('span', 'b403-val'); line.appendChild(val);
    var hasDoc = !!row.querySelector('.sk-dot.ok');
    var prog = row.querySelector('.sk-doc.prog');
    var adds = [], menuItems = [], stateTxt = null, stateCls = '';
    // Skjölin: hvert .sk-att-wrap = eitt skjal með ✓ (valkvætt), chippi og ✕.
    Array.prototype.slice.call(row.children).forEach(function (c) {
      if (c.classList.contains('sk-dot') || c.classList.contains('sk-svc-tag')) return;
      if (c.classList.contains('sk-att-wrap')) {
        var sk = el('span', 'b403-skjal');
        Array.prototype.slice.call(c.children).forEach(function (k) {
          if (k.classList.contains('sk-att-x')) {
            var isAtt = k.hasAttribute('data-del');
            menuItems.push({ label: isAtt ? 'Eyða viðhengi' : 'Eyða skráningu', icon: ICON.trash, orig: k, danger: true, name: txt(sk) });
          } else sk.appendChild(deEmoji(k));
        });
        val.appendChild(sk);
        return;
      }
      if (c.classList.contains('sk-doc') && c.classList.contains('add')) { addLabel(c); adds.push(c); return; }
      if (c.classList.contains('sk-doc') && c.classList.contains('prog')) { val.appendChild(deEmoji(c)); return; }
      if (c.classList.contains('sk-add')) { c.textContent = stripEmoji(txt(c)); val.appendChild(c); return; }
      if (c.classList.contains('sk-svc-pay')) { stateTxt = /Greitt/.test(txt(c)) && !/Ó/.test(txt(c)) ? 'Greiddur' : 'Ógreiddur'; stateCls = /Ógreitt/.test(txt(c)) ? 'vantar' : 'ok'; c.classList.add('b403-hidden-orig'); val.appendChild(c); return; }
      if (c.classList.contains('sk-svc-amt')) { c.classList.add('b403-upph'); line.appendChild(c); return; }
      val.appendChild(c); // .sk-doc.prog, .sk-add (Opna skoðun), .sk-link-wrap, annað
    });
    // Skil fyrir skjal sem vantar: takkinn sjálfur er skilið (engin fela, enginn staðgengill).
    if (!hasDoc && !prog && adds.length) {
      line.classList.add('slot');
      adds.forEach(function (a) { a.classList.add('b403-slot-btn'); val.appendChild(a); });
      adds = [];
    }
    adds.forEach(function (a) { menuItems.unshift({ label: 'Bæta við skjali', icon: ICON.plus, orig: a }); });
    // Stöðuplata
    if (!stateTxt) { if (hasDoc) { stateTxt = 'Komin'; stateCls = 'ok'; } else if (prog) { stateTxt = 'Í vinnslu'; stateCls = 'vinnsla'; } else { stateTxt = 'Vantar'; stateCls = 'vantar'; } }
    line.appendChild(plata(stateTxt, stateCls));
    if (menuItems.length) line.appendChild(menuButton(menuItems, 'Fleiri aðgerðir fyrir ' + labelText.toLowerCase()));
    return { line: line, hasDoc: hasDoc, prog: !!prog };
  }

  // ── þjónustuspjald úr .sk-svc-card ──
  function composeCard(card) {
    var hd = card.querySelector('.sk-svc-hd');
    var label = txt(hd && hd.querySelector('b'));
    var out = el('article', 'b403-spjald');
    if (card.classList.contains('sk-svc-empty')) {
      out.classList.add('tomt');
      var h0 = el('div', 'b403-nafn', svcIcon(label)); h0.appendChild(el('h3', '', label));
      var ws0 = hd && hd.querySelector('.sk-svc-ws'); if (ws0) { ws0.classList.add('b403-btn-malmur'); h0.appendChild(ws0); }
      out.appendChild(h0);
      var r0 = card.querySelector('.sk-svc-row');
      var body0 = el('div', 'b403-body');
      var l0 = el('div', 'b403-rod slot');
      var t0 = el('span', 'b403-val');
      if (r0) Array.prototype.slice.call(r0.childNodes).forEach(function (n) { if (n.nodeType === 3) { var t = txt(n); if (t) t0.appendChild(el('span', 'b403-tomt-txt', t.charAt(0).toUpperCase() + t.slice(1))); } else if (n.classList && n.classList.contains('sk-doc') && n.classList.contains('add')) { n.classList.add('b403-slot-btn'); addLabel(n); t0.appendChild(n); } else t0.appendChild(n); });
      l0.appendChild(t0); body0.appendChild(l0); out.appendChild(body0);
      return out;
    }
    var head = el('div', 'b403-nafn', svcIcon(label));
    head.appendChild(el('h3', '', label));
    var rows = Array.prototype.slice.call(card.querySelectorAll(':scope > .sk-svc-row'));
    var body = el('div', 'b403-body');
    var okN = 0;
    rows.forEach(function (r) {
      var tag = r.querySelector('.sk-svc-tag');
      var lt = tag ? txt(tag) : 'Skjal';
      lt = lt.charAt(0).toUpperCase() + lt.slice(1);
      var res = composeRow(r, lt);
      if (res.hasDoc) okN++;
      if (tag) { tag.classList.add('b403-orig-tag'); res.line.appendChild(tag); }
      body.appendChild(res.line);
    });
    var frac = el('span', 'b403-frac', okN + '<span>/' + rows.length + '</span>');
    head.appendChild(frac);
    var st = hd && hd.querySelector('.sk-svc-st');
    var stCls = st ? (st.classList.contains('ok') ? 'ok' : st.classList.contains('part') ? 'vantar' : 'vinnsla') : 'vinnsla';
    var stTxt = stCls === 'ok' ? 'Komið' : stCls === 'vantar' ? 'Vantar' : 'Í vinnslu';
    var stamp = el('span', 'b403-stimpill ' + stCls, '<i aria-hidden="true"></i>' + stTxt);
    if (st) { st.classList.add('b403-orig-st'); stamp.appendChild(st); }
    head.appendChild(stamp);
    var send = hd && hd.querySelector('.sk-svc-send');
    if (send) { send.classList.add('b403-senda'); send.innerHTML = ICON.send + 'Senda'; head.appendChild(send); }
    var items = [];
    var ws = hd && hd.querySelector('.sk-svc-ws'); if (ws) items.push({ label: 'Opna þjónustusíðu', icon: ICON.open, orig: ws });
    if (items.length) head.appendChild(menuButton(items, 'Fleiri aðgerðir fyrir ' + label));
    // Allt annað sem stóð í hausnum og var ekki þekkt → sýnilegt í hausnum áfram.
    if (hd) Array.prototype.slice.call(hd.children).forEach(function (k) { if (k.tagName !== 'B' && !k.classList.contains('b403-orig-st')) head.appendChild(k); });
    out.appendChild(head); out.appendChild(body);
    // Leifar í spjaldinu (óþekktar línur) → sýnilegar neðst í spjaldinu.
    Array.prototype.slice.call(card.children).forEach(function (k) { if (k !== hd && k.querySelector && interactive(k) > 0) { k.classList.add('b403-leif'); body.appendChild(k); } });
    return { el: out, okN: okN, n: rows.length, prog: !!card.querySelector('.sk-doc.prog') };
  }

  // ── samningsreitur úr .sk-samn-card ──
  function composeSamn(card) {
    var cell = el('div', 'b403-samn', ICON.samn);
    var b = card.querySelector('b'); var name = txt(b).replace(/^Samningur\s*[—–-]\s*/, '');
    cell.appendChild(el('span', 'b403-samn-nafn', 'Samningur <span class="lys">· ' + name + '</span>'));
    var h = el('span', 'b403-samn-h'); cell.appendChild(h);
    var items = [], adds = [];
    Array.prototype.slice.call(card.children).forEach(function (c) {
      if (c === b) return;
      if (c.classList.contains('sk-att-wrap')) {
        var sk = el('span', 'b403-skjal');
        Array.prototype.slice.call(c.children).forEach(function (k) {
          if (k.classList.contains('sk-att-x')) items.push({ label: 'Eyða skráningu', icon: ICON.trash, orig: k, danger: true }); else sk.appendChild(deEmoji(k));
        });
        h.appendChild(sk); return;
      }
      if (c.classList.contains('sk-doc') && c.classList.contains('add')) { adds.push(c); return; }
      if (c.classList.contains('sk-samn-yrs')) { c.classList.add('b403-yrs'); h.appendChild(c); return; }
      if (c.classList.contains('sk-samn-pill')) {
        var cls = c.classList.contains('gildi') ? 'ok' : c.classList.contains('utrunn') ? 'gull' : 'vantar';
        var p = plata(txt(c).replace(/^Í GILDI$/i, 'Í gildi').replace(/^VANTAR$/i, 'Vantar').replace(/^ÚTRUNNINN/i, 'Útrunninn'), cls);
        c.classList.add('b403-hidden-orig'); p.appendChild(c); h.appendChild(p); return;
      }
      h.appendChild(c);
    });
    var hasDoc = !!h.querySelector('.b403-skjal');
    if (!hasDoc && adds.length) { adds.forEach(function (a) { a.classList.add('b403-btn-litill'); a.innerHTML = ICON.plus + 'Samningur'; h.appendChild(a); }); adds = []; }
    adds.forEach(addLabel);
    adds.forEach(function (a) { items.unshift({ label: 'Bæta við samningi', icon: ICON.plus, orig: a }); });
    if (items.length) h.appendChild(menuButton(items, 'Fleiri aðgerðir fyrir samning'));
    return cell;
  }

  function kafli(title, extras) {
    var k = el('div', 'b403-kafli');
    k.appendChild(el('span', 'b403-kafli-t', title));
    (extras || []).forEach(function (x) { k.appendChild(x); });
    return k;
  }

  // ── uppröðunin ──
  function compose(section) {
    if (section.querySelector('.b403-root')) return;
    if (!section.querySelector('.sk-yrwrap')) return; // Hleð… eða villa — 199 ræður
    var before = interactive(section);
    var originals = Array.prototype.slice.call(section.children);
    var root = el('div', 'b403-root');

    // Talning úr spjöldunum (aðeins ár með þjónustu)
    var komin = 0, vinnsla = 0, vantar = 0;
    section.querySelectorAll('.sk-svc-card:not(.sk-svc-empty) .sk-svc-row').forEach(function (r) {
      if (r.querySelector('.sk-dot.ok')) komin++; else if (r.querySelector('.sk-doc.prog')) vinnsla++; else vantar++;
    });
    var alls = komin + vinnsla + vantar;

    // ── haus ──
    var head = el('header', 'b403-haus');
    head.innerHTML = '<span class="b403-hnod tl"></span><span class="b403-hnod tr"></span><span class="b403-hnod bl"></span><span class="b403-hnod br"></span>';
    var hl = el('div', 'b403-haus-v');
    hl.appendChild(el('div', 'b403-titill', '<i class="b403-led"></i>Skjöl og viðhengi'));
    hl.appendChild(el('div', 'b403-talning', '<span class="tala">' + vantar + '</span><span class="tlabel">' + (vantar === 1 ? 'skjal vantar' : 'skjöl vantar') + '</span>'));
    if (alls) {
      hl.appendChild(el('div', 'b403-stika', '<i style="flex:' + komin + ';background:linear-gradient(150deg,#1f9d57,#0a4a26)"></i><i style="flex:' + vinnsla + ';background:linear-gradient(150deg,#4f74dc,#16306f)"></i><i style="flex:' + vantar + ';background:linear-gradient(150deg,#e25555,#a01818)"></i>'));
      hl.appendChild(el('div', 'b403-skyring', '<span><i style="background:#7fe0a8"></i>Komin <b>' + komin + '</b></span><span><i style="background:#9fd0ff"></i>Í vinnslu <b>' + vinnsla + '</b></span><span><i style="background:#ff9d95"></i>Vantar <b>' + vantar + '</b></span><span class="dauf">· ' + alls + ' skjöl</span>'));
    }
    head.appendChild(hl);
    var hr = el('div', 'b403-haus-h');
    var month = section.querySelector('.sk-month-pill');
    if (month) {
      var mt = stripEmoji(txt(month)); var mi = MAN_STUTT.indexOf(mt.toLowerCase());
      var nl = el('div', 'b403-naesta', ICON.cal + 'Næsta úttekt <b>' + (mi >= 0 ? MANUDIR[mi] : (mt || '—')) + '</b>');
      month.classList.add('b403-blyantur'); month.innerHTML = ICON.pen; nl.appendChild(month);
      hr.appendChild(nl);
    }
    var takkar = el('div', 'b403-takkar');
    var mail = section.querySelector('.sk-mailpref'); if (mail) { mail.classList.add('b403-chip-rofi'); takkar.appendChild(mail); }
    var add = section.querySelector('.sk-h .sk-add-btn'); if (add) { add.classList.add('b403-btn-raudur'); add.innerHTML = ICON.plus + 'Viðhengi'; takkar.appendChild(add); }
    hr.appendChild(takkar); head.appendChild(hr);
    root.appendChild(head);

    var stal = el('div', 'b403-stal');

    // ── ársröð ──
    var arrod = el('div', 'b403-arrod', '<span class="b403-merki">Staða eftir ári</span>');
    section.querySelectorAll('.sk-pill[data-yr]').forEach(function (p) {
      p.classList.add('b403-arplata');
      var y = p.getAttribute('data-yr'); var full = y && y.length === 2 ? '20' + y : y;
      var ledCls = p.classList.contains('ok') ? 'ok' : p.classList.contains('gap') ? 'gull' : p.classList.contains('claude') ? 'vinnsla' : 'stal';
      p.innerHTML = '<i class="led ' + ledCls + '"></i>' + full;
      if (p.classList.contains('now')) p.classList.add('nuna');
      arrod.appendChild(p);
    });
    var addYr = section.querySelector('[data-add-yr-svc]'); if (addYr) { addYr.classList.add('b403-btn-litill'); addYr.innerHTML = ICON.plus + 'Ár / þjónusta'; arrod.appendChild(addYr); }
    var yrAdd = section.querySelector('.sk-yr-add'); var sub = yrAdd && yrAdd.querySelector('.sk-sub'); if (sub) { sub.classList.add('b403-hint'); arrod.appendChild(sub); }
    stal.appendChild(arrod);

    // ── samningar ──
    var samnGrid = section.querySelector('.sk-samn-grid');
    if (samnGrid) {
      var samn = el('div', 'b403-samn-rod');
      Array.prototype.slice.call(samnGrid.querySelectorAll('.sk-samn-card')).forEach(function (c) { samn.appendChild(composeSamn(c)); });
      stal.appendChild(samn);
    }

    // ── árin ──
    section.querySelectorAll('.sk-yrblock').forEach(function (blk) {
      var lab = blk.querySelector('.sk-yr-label');
      var cards = Array.prototype.slice.call(blk.querySelectorAll(':scope > .sk-svc-grid > .sk-svc-card'));
      var grid = el('div', 'b403-rod3');
      var ok = 0, n = 0, nSvc = 0;
      cards.forEach(function (c) {
        var r = composeCard(c);
        if (r.el) { grid.appendChild(r.el); } else { grid.appendChild(r); }
        if (r.okN != null) { ok += r.okN; n += r.n; nSvc++; }
      });
      var band = el('div', 'b403-band');
      if (lab) {
        var y = lab.getAttribute('data-yr');
        var state = lab.classList.contains('sk-yr-ok') ? 'ok' : lab.classList.contains('sk-yr-gap') ? 'gull' : lab.classList.contains('sk-yr-claude') ? 'vinnsla' : lab.classList.contains('sk-yr-now') ? 'nuna' : '';
        var stTxt = state === 'ok' ? ' · lokið' : state === 'gull' ? ' · skýrsla vantar' : state === 'vinnsla' ? ' · yfirfarið' : state === 'nuna' ? ' · í vinnslu' : '';
        lab.classList.add('b403-ar'); lab.classList.add(state || 'x'); lab.innerHTML = '<i class="led"></i>' + y + '<small>' + stTxt + '</small>';
        band.appendChild(lab);
      }
      band.appendChild(el('span', 'b403-pill', nSvc + (nSvc === 1 ? ' þjónusta' : ' þjónustur')));
      band.appendChild(el('span', 'b403-lina'));
      band.appendChild(el('span', 'b403-hint', n ? (ok + ' af ' + n + ' skjölum ' + (ok === 1 ? 'komið' : 'komin')) : 'engin þjónusta skráð'));
      stal.appendChild(band); stal.appendChild(grid);
    });

    // ── strips: Önnur viðhengi · Hreyfingar · Ósótt · ekki tengt · Laga pörun ──
    var annad = el('div', 'b403-annad');
    originals.forEach(function (c) {
      if (!c.classList || !c.classList.contains('sk-strip')) return;
      var l = c.querySelector('.sk-strip-l'); var r = c.querySelector('.sk-strip-r'); var lt = stripEmoji(txt(l));
      if (/Önnur viðhengi/i.test(lt) && r) {
        var addV = r.querySelector('.sk-doc.add'); var extras = [];
        if (addV) { addV.classList.add('b403-btn-litill'); addV.innerHTML = ICON.plus + 'Viðhengi'; extras.push(addV); }
        var wraps = Array.prototype.slice.call(r.querySelectorAll('.sk-att-wrap'));
        stal.appendChild(kafli('Önnur viðhengi', [el('span', 'b403-pill', String(wraps.length)), el('span', 'b403-lina')].concat(extras)));
        var vidh = el('div', 'b403-vidh');
        wraps.forEach(function (w) {
          var line = el('div', 'b403-skjal-lina'); var items = [];
          Array.prototype.slice.call(w.children).forEach(function (k) { if (k.classList.contains('sk-att-x')) items.push({ label: 'Eyða viðhengi', icon: ICON.trash, orig: k, danger: true }); else { k.classList.add('b403-vidh-chip'); line.appendChild(deEmoji(k)); } });
          if (items.length) line.appendChild(menuButton(items, 'Fleiri aðgerðir fyrir viðhengi'));
          vidh.appendChild(line);
        });
        if (!wraps.length) vidh.appendChild(el('div', 'b403-skjal-lina daufur', 'Engin önnur viðhengi'));
        stal.appendChild(vidh);
        // leifar
        if (interactive(r) > 0) { r.classList.add('b403-leif'); annad.appendChild(r); }
        return;
      }
      if (/Hreyfingar/i.test(lt) && r) {
        var rows = Array.prototype.slice.call(r.children);
        var last = rows[rows.length - 1];
        stal.appendChild(kafli('Hreyfingar', [el('span', 'b403-pill', (rows.length - 1) + ' reikningar'), el('span', 'b403-lina'), el('span', 'b403-hint', last ? txt(last.lastElementChild) : '')]));
        var hreyf = el('div', 'b403-hreyf');
        rows.slice(0, -1).forEach(function (rw) {
          rw.classList.add('b403-skjal-lina', 'hreyf');
          var kids = Array.prototype.slice.call(rw.children);
          if (kids[0]) { kids[0].classList.add('teg'); kids[0].textContent = stripEmoji(txt(kids[0])); }
          if (kids[1]) { kids[1].classList.add('dags'); var d = txt(kids[1]); var m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) kids[1].textContent = m[3] + '/' + m[2] + '/' + m[1]; }
          if (kids[3]) kids[3].classList.add('upph');
          var wr = rw.querySelector('.sk-att-wrap'); if (wr) { var items = []; Array.prototype.slice.call(wr.children).forEach(deEmoji); Array.prototype.slice.call(wr.children).forEach(function (k) { if (k.classList.contains('sk-att-x')) items.push({ label: 'Eyða skráningu', icon: ICON.trash, orig: k, danger: true }); }); if (items.length) rw.appendChild(menuButton(items, 'Fleiri aðgerðir')); }
          hreyf.appendChild(rw);
        });
        if (last) { last.classList.add('b403-hidden-info'); hreyf.appendChild(last); } // samtalan stendur í kaflanum
        stal.appendChild(hreyf);
        return;
      }
      if (c.querySelector('a[href*="brunaholf"]')) { var a = c.querySelector('a'); a.classList.add('b403-tengill'); a.innerHTML = 'Laga pörun í Brunahólf ' + ICON.open; var kk = stal.querySelector('.b403-kafli:last-of-type'); (kk || stal).appendChild(a); return; }
      // Ósótt / ekki tengt / Staða eftir ári (tóm) / annað: sýnilegt eins og það kom
      if (interactive(c) > 0 || /Ósótt|Ekki enn tengt/i.test(txt(c))) { c.classList.add('b403-leif'); annad.appendChild(c); }
    });

    root.appendChild(stal);
    if (annad.children.length) { stal.appendChild(kafli('Annað', [el('span', 'b403-lina')])); stal.appendChild(annad); }

    // Allt sem enn stendur í upprunalegu börnunum og er gagnvirkt → „Annað" (ekkert falið).
    section.appendChild(root);
    originals.forEach(function (c) {
      if (c === root) return;
      if (c.querySelector && interactive(c) > 0) { c.classList.add('b403-leif'); if (!annad.parentNode) { stal.appendChild(kafli('Annað', [el('span', 'b403-lina')])); stal.appendChild(annad); } annad.appendChild(c); }
      else c.classList.add('b403-gamalt');
    });

    var after = interactive(section);
    if (after < before) {
      console.error('[403] uppröðun tapaði ' + (before - after) + ' tengingum — dregin til baka');
      root.remove();
      Array.prototype.slice.call(section.querySelectorAll('.b403-gamalt')).forEach(function (c) { c.classList.remove('b403-gamalt'); });
      section.classList.remove('b403');
      section.dataset.b403fail = '1';
      return;
    }
    section.classList.add('b403');
    section.dataset.b403 = String(before);
  }

  // ── keyrsla: fylgist með spjaldinu ──
  function scope() {
    var h = document.documentElement;
    return h.getAttribute('data-thm-preset') === 'brunastal' && h.getAttribute('data-viewmode') !== 'mobile' && !h.classList.contains('slokk-phone-dev') && !document.body.classList.contains('appmode');
  }
  var timer = null;
  function tick() {
    if (!scope()) return;
    var main = document.getElementById('companies-main'); if (!main) return;
    Array.prototype.slice.call(main.querySelectorAll('._dyg-section')).forEach(function (s) { if (s.dataset.b403fail === '1' && !s.querySelector('.sk-yrwrap')) delete s.dataset.b403fail; if (s.dataset.b403fail === '1') return; try { compose(s); } catch (err) { console.error('[403]', err); } });
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(tick, 60); }
  (function watch() {
    var main = document.getElementById('companies-main');
    if (!main) { setTimeout(watch, 700); return; }
    new MutationObserver(schedule).observe(main, { childList: true, subtree: true });
    // Öryggispúls: 199 getur skilað síðustu teikningunni meðan síminn/viewmode er enn óráðinn
    // (scope() false þá) og engin breyting kemur á eftir — púlsinn tekur það upp. Ódýrt: eitt querySelector.
    setInterval(tick, 1500);
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('resize', schedule);
    schedule();
  })();

  // ── CSS ──
  if (!document.getElementById('skjol-403')) {
    var P = 'html[data-thm-preset="brunastal"] #companies-main ._dyg-section.b403 ';
    function r(sel, css) { return sel.split(',').map(function (s) { return P + s.trim(); }).join(',') + '{' + css + '}'; }
    var LINE = 'background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)';
    var SILVER_BTN = 'background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.14)!important;color:#1f2530!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)!important;text-shadow:none';
    var css = [
      // upprunalegu börnin sem ekkert gagnvirkt eiga eru falin (aðeins tómir umbúðahnútar eftir færslu)
      r('> .b403-gamalt', 'display:none'),
      r('', 'background:#e2e6ec;background-image:' + PLATE_IMG + ';border:1px solid #000;border-radius:14px;overflow:visible;box-shadow:0 30px 60px -20px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3);font-family:' + SANS + ';padding:0;margin:14px 0'),
      r('.b403-root', 'display:flex;flex-direction:column'),
      r('.b403-hidden-orig,.b403-orig,.b403-orig-st,.b403-orig-tag', 'position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;opacity:0!important;margin:0!important;padding:0!important;border:0!important;pointer-events:none'),
      r('.b403-hidden-info', 'display:none'),
      // haus
      r('.b403-haus', 'position:relative;background:' + METAL + ';color:#fff;border-bottom:1px solid #000;border-radius:13px 13px 0 0;padding:20px 22px 18px;display:flex;align-items:flex-start;gap:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)'),
      r('.b403-hnod', 'position:absolute;width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7)'),
      r('.b403-hnod.tl', 'left:8px;top:8px'), r('.b403-hnod.tr', 'right:8px;top:8px'), r('.b403-hnod.bl', 'left:8px;bottom:8px'), r('.b403-hnod.br', 'right:8px;bottom:8px'),
      r('.b403-titill', 'font-family:' + MONO + ';font-size:11.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#d9dee6;display:flex;align-items:center;gap:9px'),
      r('.b403-led', 'width:8px;height:8px;border-radius:50%;background:#f6b545;box-shadow:0 0 0 3px rgba(246,181,69,.18),0 0 12px rgba(246,181,69,.85)'),
      r('.b403-talning', 'display:flex;align-items:baseline;gap:10px;margin-top:8px'),
      r('.b403-talning .tala', 'font-family:' + DISPLAY + ';font-size:48px;font-weight:800;line-height:1;letter-spacing:-.02em;font-variant-numeric:lining-nums;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),
      r('.b403-talning .tlabel', 'font-family:' + DISPLAY + ';font-size:18px;font-weight:700;color:#d9dee6'),
      r('.b403-stika', 'display:flex;gap:3px;height:8px;margin-top:12px;width:460px;max-width:100%'),
      r('.b403-stika i', 'display:block;border-radius:4px;height:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.4);min-width:0'),
      r('.b403-skyring', 'display:flex;gap:14px;margin-top:6px;font-family:' + MONO + ';font-size:11.5px;font-weight:500;color:#d5dbe6;flex-wrap:wrap'),
      r('.b403-skyring span', 'display:inline-flex;align-items:center;gap:5px'), r('.b403-skyring b', 'font-weight:700;color:#fff'), r('.b403-skyring i', 'width:6px;height:6px;border-radius:50%;display:inline-block'), r('.b403-skyring .dauf', 'color:#8e97a6'),
      r('.b403-haus-h', 'margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:10px'),
      r('.b403-naesta', 'font-family:' + MONO + ';font-size:11.5px;color:#d5dbe6;display:flex;align-items:center;gap:8px'), r('.b403-naesta b', 'color:#fff;font-weight:700'),
      r('.b403-blyantur', 'all:unset;cursor:pointer;width:24px;height:24px;border-radius:6px;color:#d5dbe6;display:inline-flex;align-items:center;justify-content:center'), r('.b403-blyantur:hover', 'background:rgba(255,255,255,.12);color:#fff'),
      r('.b403-takkar', 'display:flex;gap:8px;align-items:center'),
      r('.b403-chip-rofi', 'height:40px;padding:0 12px!important;border-radius:9px!important;font-family:' + SANS + '!important;font-size:13px!important;font-weight:600!important;display:inline-flex;align-items:center;gap:8px;cursor:pointer;' + SILVER_BTN),
      r('.b403-chip-rofi::before', 'content:"";width:6px;height:6px;border-radius:50%;background:#1f9d57;display:inline-block'), r('.b403-chip-rofi[data-off="1"]::before', 'background:#e25555'),
      r('.b403-btn-raudur', 'height:40px;padding:0 16px 0 12px;border-radius:10px;border:1px solid rgba(190,32,28,.55);background:' + BSTAL + ';box-shadow:0 0 16px -4px rgba(160,16,16,.55),inset 0 1px 0 rgba(255,255,255,.16);color:#fff;font-family:' + SANS + ';font-size:14px;font-weight:700;letter-spacing:.01em;display:inline-flex;align-items:center;gap:7px;text-shadow:0 1px 1px rgba(0,0,0,.55);cursor:pointer'),
      // stálplata
      r('.b403-stal', 'padding:14px 12px 20px;display:flex;flex-direction:column;gap:12px'),
      r('.b403-merki', 'font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3a4250'),
      r('.b403-arrod', 'display:flex;align-items:center;gap:8px;flex-wrap:wrap'),
      r('.b403-arplata', 'all:unset;cursor:pointer;height:30px;padding:0 12px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);color:#11141c;font-family:' + MONO + ';font-size:12.5px;font-weight:700;display:inline-flex;align-items:center;gap:6px;box-sizing:border-box'),
      r('.b403-arplata .led', 'width:5px;height:5px;border-radius:50%;display:inline-block;background:#8f98a8'), r('.b403-arplata .led.ok', 'background:#7fe0a8'), r('.b403-arplata .led.gull', 'background:#ffe0a0'), r('.b403-arplata .led.vinnsla', 'background:#9fd0ff'),
      r('.b403-arplata.nuna', 'background:' + GULL + ';border-color:rgba(190,150,60,.5);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 0 14px -4px rgba(211,171,78,.6)'), r('.b403-arplata.nuna .led', 'background:#f7e6a8'),
      r('.b403-hint', 'margin-left:auto;font-family:' + MONO + ';font-size:11.5px;color:#525b6b'),
      r('.b403-btn-litill', 'all:unset;cursor:pointer;height:32px;padding:0 10px 0 8px;border-radius:7px;border:1px solid rgba(20,24,34,.14);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);color:#1f2530;font-family:' + SANS + ';font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:5px;box-sizing:border-box'),
      r('.b403-btn-malmur', 'all:unset;cursor:pointer;height:34px;padding:0 12px;border-radius:9px;border:1px solid #000;background:' + METAL_BTN + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4;font-family:' + SANS + ';font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:7px;box-sizing:border-box;margin-left:8px'),
      // samningar
      r('.b403-samn-rod', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:8px'),
      r('.b403-samn', 'display:flex;align-items:center;gap:10px;padding:8px 12px 8px 8px;min-height:48px;font-size:13px;font-weight:600;color:#1f2530;background:#fff;border-radius:12px;border:1px solid #000;box-shadow:0 12px 30px -16px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.9)'),
      r('.b403-samn > svg', 'padding:7px;border-radius:7px;background:' + METAL_BTN + ';color:#eef1f4;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 1px 2px rgba(0,0,0,.35);flex:none'),
      r('.b403-samn-nafn .lys', 'font-weight:400;color:#5b6472;font-size:12px'),
      r('.b403-samn-h', 'margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;min-width:0'),
      r('.b403-yrs', 'font-family:' + MONO + ';font-size:11.5px;color:#5b6472;font-weight:500'),
      // bönd
      r('.b403-band', 'position:relative;display:flex;align-items:center;gap:10px;background:' + METAL + ';border:1px solid #000;border-radius:6px;min-height:40px;padding:0 16px 0 20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 6px 14px -8px rgba(0,0,0,.6);color:#eef1f4'),
      r('.b403-band::before,.b403-band::after,.b403-nafn::before,.b403-nafn::after,.b403-kafli::before,.b403-kafli::after', 'content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);pointer-events:none'),
      r('.b403-band::before,.b403-nafn::before,.b403-kafli::before', 'left:7px'), r('.b403-band::after,.b403-nafn::after,.b403-kafli::after', 'right:7px'),
      r('.b403-ar', 'display:inline-flex;align-items:center;gap:10px;font-family:' + DISPLAY + '!important;font-size:20px!important;font-weight:800!important;letter-spacing:-.01em;color:#eef1f4!important;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35);margin:0!important;cursor:pointer'),
      r('.b403-ar small', 'font-family:' + MONO + ';font-size:11.5px;font-weight:500;letter-spacing:0;color:#d5dbe6;text-shadow:none'),
      r('.b403-ar .led', 'width:8px;height:8px;border-radius:50%;background:#8f98a8;box-shadow:0 0 0 3px rgba(255,255,255,.08)'),
      r('.b403-ar.ok .led', 'background:#7fe0a8;box-shadow:0 0 0 3px rgba(255,255,255,.08),0 0 12px #7fe0a8'), r('.b403-ar.gull .led', 'background:#ffe0a0;box-shadow:0 0 0 3px rgba(255,255,255,.08),0 0 12px #ffe0a0'), r('.b403-ar.vinnsla .led', 'background:#9fd0ff;box-shadow:0 0 0 3px rgba(255,255,255,.08),0 0 12px #9fd0ff'), r('.b403-ar.nuna .led', 'background:#f7e6a8;box-shadow:0 0 0 3px rgba(255,255,255,.08),0 0 12px #f7e6a8'),
      r('.b403-pill', 'height:18px;padding:0 7px;border-radius:99px;background:rgba(255,255,255,.12);font-family:' + MONO + ';font-size:10.5px;font-weight:700;color:#fff;display:inline-flex;align-items:center'),
      r('.b403-lina', 'flex:1;height:1px;background:rgba(255,255,255,.12)'),
      r('.b403-band .b403-hint,.b403-kafli .b403-hint', 'margin-left:0;color:#d5dbe6'),
      r('.b403-kafli', 'position:relative;display:flex;align-items:center;gap:10px;background:' + METAL + ';border:1px solid #000;border-radius:6px;min-height:40px;padding:0 16px 0 20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 6px 14px -8px rgba(0,0,0,.6);color:#eef1f4;margin-top:4px'),
      r('.b403-kafli-t', 'font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#eef1f4'),
      r('.b403-tengill', 'margin-left:12px;font-family:' + SANS + ';font-size:12px!important;font-weight:500!important;color:#ff9d95!important;text-decoration:none;display:inline-flex;align-items:center;gap:5px'),
      // spjöld
      r('.b403-rod3', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:10px'),
      r('.b403-spjald', 'display:flex;flex-direction:column;background:#eef1f6;background-image:' + INNER_IMG + ';border:1px solid #000;border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);position:relative;min-height:72px'),
      r('.b403-spjald.tomt', 'background:rgba(255,255,255,.35);border:1.5px dashed rgba(20,24,34,.24);box-shadow:inset 0 2px 5px rgba(0,0,0,.06)'),
      r('.b403-nafn', 'position:relative;display:flex;align-items:center;gap:8px;background:' + METAL + ';color:#fff;min-height:46px;padding:5px 12px 5px 20px;border-bottom:1px solid #000;border-radius:11px 11px 0 0;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)'),
      r('.b403-nafn > svg', 'color:#eef1f4;flex:none'),
      r('.b403-nafn h3', 'margin:0;font-family:' + SANS + ';font-size:15px;font-weight:600;line-height:1.25;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5)'),
      r('.b403-spjald.tomt .b403-nafn', 'background:transparent;border-bottom:0;box-shadow:none;color:#525b6b'), r('.b403-spjald.tomt .b403-nafn::before,.b403-spjald.tomt .b403-nafn::after', 'display:none'), r('.b403-spjald.tomt .b403-nafn h3,.b403-spjald.tomt .b403-nafn > svg', 'color:#525b6b;text-shadow:none'),
      r('.b403-frac', 'font-family:' + MONO + ';font-size:13px;font-weight:700;letter-spacing:-.02em;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5);flex:none'), r('.b403-frac span', 'color:#8e97a6'),
      r('.b403-stimpill', 'font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;display:inline-flex;align-items:center;gap:5px;flex:none;margin-right:2px;position:relative'),
      r('.b403-stimpill i', 'width:6px;height:6px;border-radius:50%;display:inline-block;background:currentColor'),
      r('.b403-stimpill.ok', 'color:#7fe0a8'), r('.b403-stimpill.vantar', 'color:#ff9d95'), r('.b403-stimpill.vinnsla', 'color:#9fd0ff'),
      r('.b403-senda', 'all:unset;cursor:pointer;height:40px;padding:0 14px 0 12px;border-radius:9px;border:1px solid rgba(52,168,98,.55);background:' + SAEKJA + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3);color:#fff;font-family:' + SANS + ';font-size:13px;font-weight:700;letter-spacing:.01em;text-shadow:0 1px 1px rgba(0,0,0,.55);display:inline-flex;align-items:center;gap:7px;box-sizing:border-box;margin-left:6px'),
      r('.b403-body', 'padding:8px 8px 10px;display:flex;flex-direction:column;gap:6px'),
      r('.b403-rod', LINE + ';display:flex;align-items:center;gap:6px;min-height:38px;padding:4px 6px 4px 10px;font-size:12px;color:#5b6472;position:relative;flex-wrap:wrap'),
      r('.b403-rod.slot', 'background:rgba(255,255,255,.35);box-shadow:inset 0 2px 5px rgba(0,0,0,.08);border:1.5px dashed rgba(20,24,34,.24);color:#525b6b'),
      r('.b403-lbl', 'font-family:' + SANS + ';font-size:12px;font-weight:500;color:#2b313c;width:70px;flex:none'),
      r('.b403-val', 'flex:1;min-width:0;display:flex;align-items:center;gap:6px;flex-wrap:wrap'),
      r('.b403-skjal', 'display:inline-flex;align-items:center;gap:4px;min-width:0'),
      // skjalið sjálft er opnunartakkinn: tákn + nafn
      r('.b403-skjal .sk-doc,.b403-vidh-chip,.b403-samn-h .sk-doc', 'all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:' + SANS + ';font-size:12.5px;font-weight:500;color:#1f2530;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;padding:2px 0'),
      r('.b403-skjal .sk-doc::before,.b403-vidh-chip::before,.b403-samn-h .sk-doc::before', 'content:"";flex:none;width:28px;height:28px;border-radius:6px;border:1px solid rgba(20,24,34,.14);background:' + SILVER + ' , url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%232b313c%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><path d=%27M14 4h6v6%27/><path d=%27M20 4 10 14%27/><path d=%27M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6%27/></svg>") center/15px no-repeat;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)'),
      r('.b403-skjal .sk-doc:hover::before,.b403-vidh-chip:hover::before,.b403-samn-h .sk-doc:hover::before', 'box-shadow:inset 0 0 0 1px rgba(201,42,42,.45),0 1px 2px rgba(0,0,0,.1)'),
      r('.b403-skjal .sk-doc.inv', 'font-family:' + MONO + ';font-size:11.5px;font-weight:700'),
      r('.b403-skjal .sk-doc.miss', 'color:#845400;text-decoration:line-through'),
      r('.b403-skjal .sk-doc.inv.miss', 'text-decoration:none;font-family:' + SANS + '!important;font-weight:700;color:#b42318'),
      r('.b403-skjal .sk-doc.inv.miss::before,.b403-skjal .sk-doc.stolpi::before', 'display:none'),
      r('.b403-skjal .sk-doc.stolpi', 'all:unset;height:18px;padding:0 6px;border-radius:5px;background:#eceff4;color:#1f2530;font-family:' + MONO + ';font-size:10.5px;font-weight:700;display:inline-flex;align-items:center;cursor:help'),
      r('.b403-skjal .sk-dfc', 'width:18px;height:18px;border-radius:4px;border:1px solid rgba(20,24,34,.32);background:#fff;flex:none;display:inline-flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;color:#fff'),
      r('.b403-skjal .sk-dfc.green', 'background:linear-gradient(180deg,#1f9d57,#0a4a26);border-color:#0a4a26'), r('.b403-skjal .sk-dfc.blue', 'background:linear-gradient(180deg,#4f74dc,#16306f);border-color:#16306f'),
      r('.b403-val .sk-doc.prog', 'all:unset;display:inline-flex;align-items:center;gap:6px;font-family:' + SANS + ';font-size:12px;font-weight:500;color:#16306f'),
      r('.b403-val .sk-doc.prog::before', 'content:"";width:5px;height:5px;border-radius:50%;background:#4f74dc;display:inline-block'),
      r('.b403-val .sk-add', 'all:unset;cursor:pointer;height:26px;padding:0 9px;border-radius:6px;border:1px solid rgba(20,24,34,.14);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);color:#1f2530;font-family:' + SANS + ';font-size:12px;font-weight:600;display:inline-flex;align-items:center'),
      r('.b403-slot-btn', 'all:unset;cursor:pointer;font-family:' + SANS + ';font-size:12px;font-weight:500;color:#525b6b;display:inline-flex;align-items:center;gap:6px;flex:1;min-height:28px'),
      r('.b403-slot-btn::before', 'content:"";width:14px;height:14px;background:url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23525b6b%27 stroke-width=%272.5%27 stroke-linecap=%27round%27><path d=%27M12 5v14M5 12h14%27/></svg>") center/14px no-repeat;flex:none'),
      r('.b403-rod.slot:hover .b403-slot-btn', 'color:#b42318'),
      r('.b403-tomt-txt', 'font-size:12px;color:#525b6b;margin-right:8px'),
      r('.b403-upph', 'font-family:' + MONO + ';font-size:11.5px;font-weight:700;color:#1f2530;flex:none;margin-left:auto;padding-right:6px'),
      r('.b403-plata', 'display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);color:#11141c;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;flex:none;white-space:nowrap;position:relative'),
      r('.b403-plata i', 'width:5px;height:5px;border-radius:50%;display:inline-block;background:#8f98a8'),
      r('.b403-plata.ok i', 'background:#1f9d57'), r('.b403-plata.vinnsla i', 'background:#4f74dc'), r('.b403-plata.vantar i', 'background:#e25555'), r('.b403-plata.gull i', 'background:#e0a93e'), r('.b403-plata.vantar', 'color:#b42318'),
      r('.b403-leif', 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;padding:6px 10px;' + LINE),
      r('.b403-annad', 'display:flex;flex-direction:column;gap:6px'),
      // ⋯ valmynd
      r('.b403-vm', 'position:relative;flex:none;display:inline-flex'),
      r('.b403-meira', 'all:unset;cursor:pointer;width:28px;height:28px;border-radius:6px;color:#5b6472;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box'),
      r('.b403-meira:hover', 'background:rgba(20,24,34,.07)'),
      r('.b403-nafn .b403-meira', 'width:40px;height:40px;border-radius:9px;border:1px solid #000;background:' + METAL_BTN + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 1px 2px rgba(0,0,0,.25);color:#eef1f4;margin-left:6px'),
      r('.b403-meira.opin', 'border:1px solid #000;background:' + METAL_BTN + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 1px 2px rgba(0,0,0,.25);color:#eef1f4'),
      r('.b403-nafn .b403-meira.opin', 'background:' + SILVER + ';color:#11141c'),
      r('.b403-menu', 'position:fixed;z-index:7900;min-width:212px;background:#fff;border:1px solid rgba(20,24,34,.12);border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);padding:6px;display:flex;flex-direction:column;gap:2px'),
      r('.b403-mi', 'all:unset;cursor:pointer;height:40px;border-radius:8px;padding:0 10px;display:flex;align-items:center;gap:10px;font-family:' + SANS + ';font-size:13.5px;font-weight:500;color:#1f2530;position:relative;box-sizing:border-box'),
      r('.b403-mi svg', 'color:#5b6472;flex:none'), r('.b403-mi:hover', 'background:#f1f4f8'), r('.b403-mi.eyda', 'color:#b42318;font-weight:600'), r('.b403-mi.eyda svg', 'color:#b42318'),
      r('.b403-skil', 'height:1px;background:#eceff3;margin:4px 6px'),
      // önnur viðhengi · hreyfingar
      r('.b403-vidh', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px'),
      r('.b403-hreyf', 'display:flex;flex-direction:column;gap:6px'),
      r('.b403-skjal-lina', LINE + ';display:flex;align-items:center;gap:8px;min-height:40px;padding:0 6px 0 8px!important;font-size:12.5px;color:#3a4250;border:0!important;position:relative'),
      r('.b403-skjal-lina.daufur', 'color:#525b6b;font-size:12px;background:rgba(255,255,255,.35);border:1.5px dashed rgba(20,24,34,.24)!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.08)'),
      r('.b403-skjal-lina .teg', 'font-weight:600;color:#1f2530;flex:0 0 76px!important;font-size:12.5px!important'),
      r('.b403-skjal-lina .dags', 'font-family:' + MONO + ';font-size:11.5px!important;color:#5b6472;flex:0 0 88px!important'),
      r('.b403-skjal-lina .upph', 'font-family:' + MONO + ';font-size:11.5px!important;font-weight:700!important;color:#1f2530;margin-left:auto'),
      r('.b403-skjal-lina .sk-att-wrap', 'display:inline-flex;align-items:center;gap:4px'),
      r('.b403-skjal-lina .sk-att-wrap .sk-doc', 'all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:' + MONO + ';font-size:11.5px;font-weight:700;color:#1f2530'),
      r('.b403-skjal-lina .sk-att-wrap .sk-doc::before', 'content:"";flex:none;width:28px;height:28px;border-radius:6px;border:1px solid rgba(20,24,34,.14);background:' + SILVER + ' , url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%232b313c%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><path d=%27M6 3h12v18l-3-2-3 2-3-2-3 2z%27/><path d=%27M9 8h6M9 12h6%27/></svg>") center/15px no-repeat;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)'),
      r('.b403-skjal-lina .sk-att-wrap .sk-doc.stolpi', 'all:unset;height:18px;padding:0 6px;border-radius:5px;background:#eceff4;color:#1f2530;font-family:' + MONO + ';font-size:10.5px;font-weight:700;display:inline-flex;align-items:center'),
      r('.b403-skjal-lina .sk-att-wrap .sk-doc.stolpi::before', 'display:none'),
      r('.b403-skjal-lina .sk-att-wrap .sk-dfc', 'width:18px;height:18px;border-radius:4px;border:1px solid rgba(20,24,34,.32);background:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;color:#fff'),
      r('.b403-skjal-lina .sk-att-wrap .sk-dfc.green', 'background:linear-gradient(180deg,#1f9d57,#0a4a26);border-color:#0a4a26'), r('.b403-skjal-lina .sk-att-wrap .sk-dfc.blue', 'background:linear-gradient(180deg,#4f74dc,#16306f);border-color:#16306f'),
      r('.b403-skjal-lina .b403-vm', 'margin-left:auto'), r('.b403-skjal-lina.hreyf .b403-vm', 'margin-left:0')
    ].join('\n');
    var st = document.createElement('style'); st.id = 'skjol-403'; st.textContent = css; document.head.appendChild(st);
  }
})();
