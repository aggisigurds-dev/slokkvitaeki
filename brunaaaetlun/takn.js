// Brunaáætlun — tákn (einfölduð ISO 7010, teiknuð hér) og yfirlögn á grunnmynd hæðar.
// Sama kóði teiknar ritilinn og prentuðu skjölin. Öll hnit eru í FRUMMYNDAR-px hæðarinnar (eins og teikning_bord),
// stærðir tákna í „einingum“ u = rammi.w / 1600 svo þau haldist jafnstór óháð upplausn teikningarinnar.
(function () {
  'use strict';
  var GR = '#138a36', RA = '#c8102e', FJ = '#5b2a86', GU = '#f2b705', BL = '#1565c0';
  var FF = 'font-family="IBM Plex Sans,Segoe UI,Arial,sans-serif"';

  // Tegundirnar sem má setja á uppdrátt. gestur: sést á flóttaáætlun gesta · starf: aðeins á rýmingaruppdrætti
  var TEG = {
    leid:  { heiti: 'Flóttaleið', en: 'Escape route', gestur: 1 },
    ut:    { heiti: 'Neyðarútgangur', en: 'Emergency exit', gestur: 1 },
    slt:   { heiti: 'Slökkvitæki', en: 'Fire extinguisher', gestur: 1 },
    f002:  { heiti: 'Brunaslanga', en: 'Fire hose reel', gestur: 1 },
    f005:  { heiti: 'Handboði', en: 'Manual call point', gestur: 1 },
    f016:  { heiti: 'Eldvarnateppi', en: 'Fire blanket', gestur: 1 },
    e003:  { heiti: 'Sjúkrakassi', en: 'First aid', gestur: 1 },
    lyfta: { heiti: 'Notið ekki lyftu', en: 'Do not use the lift', gestur: 1 },
    bv:    { heiti: 'Stjórnstöð brunaviðvörunarkerfis', en: 'Fire alarm panel', gestur: 0 },
    rafm:  { heiti: 'Rafmagnstafla', en: 'Electrical panel', gestur: 0 },
    e007:  { heiti: 'Söfnunarsvæði', en: 'Assembly point', gestur: 1 },
    ter:   { heiti: 'Þú ert hér', en: 'You are here', gestur: 1 },
    herb:  { heiti: 'Herbergi', en: 'Room', gestur: 0 },
    texti: { heiti: 'Texti', en: 'Text', gestur: 1 },
  };
  var ROD = ['leid', 'ut', 'slt', 'f002', 'f005', 'f016', 'e003', 'lyfta', 'bv', 'rafm', 'e007', 'ter', 'herb', 'texti'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var MADUR = '<circle cx="3" cy="-15" r="4.6" fill="#fff"/><g stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none">' +
    '<path d="M1,-8 L-3,5"/><path d="M-10,-2 L-1,-8 L7,-3"/><path d="M-3,5 L5,10 L3,19"/><path d="M-3,5 L-9,13 L-17,13"/></g>';

  // Skilgreiningar — einu sinni í hverju SVG (sömu auðkenni alls staðar, svo afrit í mörgum SVG skaðar ekki)
  function defs() {
    return '<defs>' +
      '<marker id="ba-or" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + GR + '"/></marker>' +
      '<g id="ba-slt"><rect x="-22" y="-22" width="44" height="44" rx="4" fill="' + RA + '"/><g fill="#fff"><rect x="-8" y="-9" width="13" height="26" rx="4"/><rect x="-5" y="-15" width="7" height="6" rx="1"/><path d="M2,-14 h9 v3 h-9z"/>' +
        '<path d="M-8,-11 q-8,4 -6,16" stroke="#fff" stroke-width="2.6" fill="none"/><path d="M13,-2 q5,5 2,11 q-1,-4 -4,-5 q1,-3 2,-6z"/></g></g>' +
      '<g id="ba-f002"><rect x="-22" y="-22" width="44" height="44" rx="4" fill="' + RA + '"/><g fill="none" stroke="#fff" stroke-width="3"><circle cx="-2" cy="0" r="13"/><circle cx="-2" cy="0" r="8"/><circle cx="-2" cy="0" r="3"/></g><path d="M11,0 h6 v10" stroke="#fff" stroke-width="3" fill="none"/></g>' +
      '<g id="ba-f005"><rect x="-22" y="-22" width="44" height="44" rx="4" fill="' + RA + '"/><rect x="-14" y="-14" width="28" height="28" rx="2" fill="none" stroke="#fff" stroke-width="3"/><circle r="6" fill="#fff"/></g>' +
      '<g id="ba-f016"><rect x="-22" y="-22" width="44" height="44" rx="4" fill="' + RA + '"/><rect x="-12" y="-13" width="24" height="22" rx="2" fill="#fff"/><path d="M-8,9 v9 M8,9 v9" stroke="#fff" stroke-width="3.5"/><path d="M-6,-6 h12 M-6,0 h12" stroke="' + RA + '" stroke-width="2"/></g>' +
      '<g id="ba-e003"><rect x="-22" y="-22" width="44" height="44" rx="4" fill="' + GR + '"/><path d="M-5,-15 h10 v10 h10 v10 h-10 v10 h-10 v-10 h-10 v-10 h10z" fill="#fff"/></g>' +
      '<g id="ba-ut"><rect x="-64" y="-28" width="128" height="56" rx="5" fill="' + GR + '"/><rect x="-58" y="-22" width="38" height="44" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><g transform="translate(-40,2) scale(.95)">' + MADUR + '</g></g>' +
      '<g id="ba-e007"><rect x="-44" y="-44" width="88" height="88" rx="5" fill="' + GR + '"/><g fill="#fff">' +
        '<path d="M-38,-38 h16 l-6,6 l10,10 l-4,4 l-10,-10 l-6,6z"/><path d="M38,-38 h-16 l6,6 l-10,10 l4,4 l10,-10 l6,6z"/>' +
        '<path d="M-38,38 h16 l-6,-6 l10,-10 l-4,-4 l-10,10 l-6,-6z"/><path d="M38,38 h-16 l6,-6 l-10,-10 l4,-4 l10,10 l6,-6z"/>' +
        '<circle cx="-11" cy="-8" r="5"/><circle cx="11" cy="-8" r="5"/><circle cx="0" cy="-12" r="5.5"/>' +
        '<path d="M-17,14 v-10 q0,-5 6,-5 q6,0 6,5 v10z M5,14 v-10 q0,-5 6,-5 q6,0 6,5 v10z M-7,16 v-13 q0,-6 7,-6 q7,0 7,6 v13z"/></g></g>' +
      '<g id="ba-ter"><circle r="30" fill="#ffd400" opacity=".92"/><circle r="20" fill="#fff"/><circle r="14" fill="' + RA + '"/></g>' +
      '<g id="ba-lyfta"><circle r="26" fill="#fff" stroke="' + RA + '" stroke-width="6"/><text y="6" text-anchor="middle" font-size="15" font-weight="800" fill="#222" ' + FF + '>LYFTA</text><line x1="-18" y1="18" x2="18" y2="-18" stroke="' + RA + '" stroke-width="6"/></g>' +
      '<g id="ba-bv"><circle r="24" fill="' + FJ + '"/><text y="8" text-anchor="middle" font-size="20" font-weight="700" fill="#fff" ' + FF + '>BV</text></g>' +
      '<g id="ba-rafm"><rect x="-30" y="-15" width="60" height="30" rx="4" fill="' + GU + '"/><text y="7" text-anchor="middle" font-size="17" font-weight="700" fill="#222" ' + FF + '>Rafm.</text></g>' +
      '</defs>';
  }

  function halo(x, y, txt, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || 'middle') + '" font-size="' + (o.fs || 20) + '" font-weight="' + (o.fw || 700) + '" fill="' + (o.lit || '#1d232b') + '" ' + FF +
      ' paint-order="stroke" stroke="#fff" stroke-width="' + (o.sw || 6) + '" stroke-linejoin="round">' + esc(txt) + '</text>';
  }

  // Eitt tákn í staðbundnum hnitum (0,0 = miðja, einingar fyrir u=1). ham: 'gestur' | 'starf' | 'ritill'
  function taknInnra(m, ham, terHerb) {
    var t = m.t;
    if (t === 'ut') {
      var s = '<use href="#ba-ut"/>' + '<text x="22" y="' + (m.texti2 === '' ? 9 : 0) + '" text-anchor="middle" font-size="23" font-weight="800" fill="#fff" ' + FF + '>' + esc(m.texti || 'ÚT') + '</text>';
      if (m.texti2 !== '') s += '<text x="22" y="19" text-anchor="middle" font-size="14" fill="#fff" ' + FF + '>' + esc(m.texti2 == null ? 'EXIT' : m.texti2) + '</text>';
      if (m.undir) s += halo(0, 50, m.undir, { fs: 19, fw: 600, lit: GR });
      return s;
    }
    if (t === 'slt') return '<use href="#ba-slt"/>' + (ham !== 'gestur' && m.n ? halo(m.v ? -27 : 27, -14, m.n, { a: m.v ? 'end' : 'start', lit: RA, sw: 5 }) : '');
    if (t === 'f002' || t === 'f005' || t === 'f016' || t === 'e003' || t === 'lyfta' || t === 'bv' || t === 'rafm') return '<use href="#ba-' + t + '"/>' + (ham !== 'gestur' && m.n ? halo(27, -14, m.n, { a: 'start', lit: '#333', sw: 5, fs: 18 }) : '');
    if (t === 'e007') {
      if (m.litid) return '<use href="#ba-e007"/>';
      return '<rect x="-175" y="-56" width="350" height="112" rx="10" fill="#fff" stroke="' + GR + '" stroke-width="5"/><g transform="translate(-112,0)"><use href="#ba-e007"/></g>' +
        '<text x="45" y="-6" text-anchor="middle" font-size="25" font-weight="800" fill="' + GR + '" ' + FF + '>SÖFNUNARSVÆÐI</text>' +
        '<text x="45" y="24" text-anchor="middle" font-size="20" font-weight="600" fill="' + GR + '" ' + FF + '>ASSEMBLY POINT</text>';
    }
    if (t === 'ter') return terMerki(m.lbl);
    if (t === 'herb') {
      if (terHerb && terHerb === m) return terMerki(m.lbl);
      if (ham === 'gestur') return '';
      return '<circle r="17" fill="#fff" stroke="' + BL + '" stroke-width="4"/>' + halo(0, 6, m.nr || '?', { fs: 16, lit: BL, sw: 0 });
    }
    if (t === 'texti') return halo(0, 0, m.texti || 'Texti', { fs: m.fs || 22, lit: m.lit || '#1d232b' });
    return '';
  }
  function terMerki(lbl) {
    var undir = lbl === 'n';
    return '<use href="#ba-ter"/>' +
      halo(undir ? 0 : 38, undir ? 52 : -4, 'ÞÚ ERT HÉR', { a: undir ? 'middle' : 'start', fs: 22, fw: 800, lit: RA }) +
      halo(undir ? 0 : 38, undir ? 72 : 20, 'YOU ARE HERE', { a: undir ? 'middle' : 'start', fs: 17, fw: 600, lit: '#333' });
  }

  // Lagið ofan á grunnmyndinni: leiðir + tákn (hvert í <g data-i> svo ritillinn geti valið það)
  function lag(rammi, merki, opts) {
    opts = opts || {};
    var ham = opts.ham || 'starf', u = rammi.w / 1600, o = [], leidir = [], adrir = [];
    (merki || []).forEach(function (m, i) { if (m.t === 'leid') leidir.push([m, i]); else adrir.push([m, i]); });
    leidir.forEach(function (p) {
      var pts = (p[0].p || []).map(function (q) { return q[0] + ',' + q[1]; }).join(' ');
      if (!pts) return;
      o.push('<g data-i="' + p[1] + '"><polyline points="' + pts + '" fill="none" stroke="#8fdca4" stroke-width="' + 46 * u + '" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/>' +
        '<polyline points="' + pts + '" fill="none" stroke="' + GR + '" stroke-width="' + 10 * u + '" stroke-linejoin="round" stroke-dasharray="' + 28 * u + ' ' + 12 * u + '" opacity=".95" marker-end="url(#ba-or)"/></g>');
    });
    adrir.forEach(function (p) {
      var m = p[0];
      if (ham === 'gestur' && TEG[m.t] && !TEG[m.t].gestur && !(m.t === 'herb' && opts.terHerb === m)) return;
      if (ham === 'gestur' && m.t === 'ter' && opts.terHerb) return;      // herbergisútgáfa: aðeins punktur herbergisins
      var inn = taknInnra(m, ham, opts.terHerb);
      if (inn) o.push('<g data-i="' + p[1] + '" transform="translate(' + m.x + ',' + m.y + ') scale(' + u + ')">' + inn + '</g>');
    });
    return o.join('');
  }

  // Heill uppdráttur: grunnmynd (dataURL af rammanum) + lagið. opts: { ham, terHerb, auka }
  function uppdrattur(rammi, myndUrl, merki, opts) {
    opts = opts || {};
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + [rammi.x, rammi.y, rammi.w, rammi.h].join(' ') + '" style="width:100%;height:100%;display:block" preserveAspectRatio="xMidYMid meet">' + defs() +
      (myndUrl ? '<image href="' + myndUrl + '" x="' + rammi.x + '" y="' + rammi.y + '" width="' + rammi.w + '" height="' + rammi.h + '" preserveAspectRatio="none"/>' : '') +
      lag(rammi, merki, opts) + (opts.auka || '') + '</svg>';
  }

  // Stakt tákn fyrir táknskýringu og hnappa
  function tak(t, h) {
    h = h || 22;
    var vb = { leid: '0 -24 120 48', ut: '-66 -30 132 60', e007: '-46 -46 92 92', ter: '-32 -32 64 64', rafm: '-32 -17 64 34', herb: '-20 -20 40 40', texti: '-40 -20 80 40' }[t] || '-24 -24 48 48';
    var inn;
    if (t === 'leid') inn = '<line x1="6" y1="0" x2="104" y2="0" stroke="#8fdca4" stroke-width="40" stroke-linecap="round" opacity=".5"/><line x1="6" y1="0" x2="100" y2="0" stroke="' + GR + '" stroke-width="9" stroke-dasharray="26 12" marker-end="url(#ba-or)"/>';
    else if (t === 'ut') inn = '<use href="#ba-ut"/><text x="22" y="9" text-anchor="middle" font-size="26" font-weight="800" fill="#fff" ' + FF + '>ÚT</text>';
    else if (t === 'e007') inn = '<use href="#ba-e007"/>';
    else if (t === 'ter') inn = '<use href="#ba-ter"/>';
    else if (t === 'herb') inn = '<circle r="17" fill="#fff" stroke="' + BL + '" stroke-width="4"/><text y="6" text-anchor="middle" font-size="15" font-weight="700" fill="' + BL + '" ' + FF + '>12</text>';
    else if (t === 'texti') inn = '<text y="9" text-anchor="middle" font-size="28" font-weight="700" fill="#1d232b" ' + FF + '>Aa</text>';
    else inn = '<use href="#ba-' + t + '"/>';
    var p = vb.split(' ').map(Number);
    return '<svg viewBox="' + vb + '" height="' + h + '" width="' + Math.round(h * p[2] / p[3]) + '" style="vertical-align:middle;flex:none" aria-hidden="true">' + defs() + inn + '</svg>';
  }

  window.BaTakn = { TEG: TEG, ROD: ROD, defs: defs, lag: lag, uppdrattur: uppdrattur, tak: tak, esc: esc, LITIR: { GR: GR, RA: RA, FJ: FJ, GU: GU, BL: BL } };
})();
