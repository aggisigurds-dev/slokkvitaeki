/* === REGLUR (449) — 08.10.2026 ==============================================
 *
 * Agnar: „Liggur við að útbúa nýja page … bara neðarlega á hliðarstikunni með öllum helstu reglum og
 * leiðbeiningum". Síðan #reglur sýnir reglusafn Arnolds: handslökkvitæki, slöngukefli, reykskynjarar,
 * neyðarlýsing, merkingar, eldvarnaeftirlit, fjölbýli, byggingarlýsing og heimildir með tenglum.
 *
 * EIN HEIMILD, EINN STAÐUR. Hér er ENGINN reglutexti. Síðan les markdown-skrárnar sem Arnold notar
 * (.claude/skills/arnold/references/*.md) þegar hún opnast; build-dist.js afritar þær í dist/reglur/.
 * Kaflarnir og röð þeirra standa í references/kaflar.json — ný skrá þar verður nýr kafli án þess að
 * snerta þennan kóða. Valkvæður kafli (t.d. flokkar.md) sem er ekki til er einfaldlega ekki sýndur.
 * Staðbundið (npx serve á rót repósins) er dist/reglur ekki til, svo leitað er líka í .claude/…/references.
 *
 * Leit síar kafla og línur (p, li, töfluraðir) án þess að teikna neitt upp á nýtt — aðeins klasi á hnút,
 * svo fókus og skrunstaða haldast. Hápunktar með CSS Custom Highlight API (engin DOM-breyting).
 * Teiknað EINU SINNI þegar öll gögn eru komin; á meðan stendur „Hleður reglum…" í plötunni og ekkert
 * fyrir neðan hana getur hoppað.
 *
 * Útlit: Brunastál C — málmhaus með hnoðum, stálplata, stálspjöld, tafla C, Playfair-fyrirsagnir.
 * Engin emoji, engir bláir takkar, tenglar látlausir. Ekkert ritað á þjóninn; enginn nýr vafralykill.
 * ========================================================================== */
(() => {
  if (window.__reglur449) return;
  window.__reglur449 = true;

  const NAV_KEY = 'reglur';
  const VIEW_ID = 'view-reglur';
  const GRUNNAR = ['/reglur/', '/.claude/skills/arnold/references/'];
  const KAFLASKRA = 'kaflar.json';
  const FYRIRVARI = 'Leiðbeinandi — endanlegt samþykki er hjá hönnuði og slökkviliði.';

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISP = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const STAL_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const DARK_PLATE = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  const RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const svg = (d, w) => '<svg width="' + (w || 16) + '" height="' + (w || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const IK = {
    leit: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    vog: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    vidvorun: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    upplys: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  };

  /* ── LEITAR-STÖÐLUN: einn stafur inn, einn stafur út (svo hápunktar standist á) ── */
  const _nc = new Map();
  function nchar(c) {
    let r = _nc.get(c);
    if (r === undefined) {
      r = c.toLowerCase().normalize('NFD').charAt(0);
      if (r === 'ð') r = 'd';
      if (!r) r = c;
      _nc.set(c, r);
    }
    return r;
  }
  function norm(s) { let o = ''; for (let i = 0; i < s.length; i++) o += nchar(s[i]); return o; }
  const normHeiti = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

  /* ── GÖGN: kaflaskrá + markdown, sótt einu sinni og geymd í minni ───────── */
  let _gogn = null, _loadP = null;
  async function saekjaTexta(grunnur, nafn) {
    const r = await fetch(grunnur + nafn, { cache: 'no-cache' });
    if (!r.ok) return null;
    const ct = String(r.headers.get('content-type') || '');
    const t = await r.text();
    // Varnir: SPA-endurvísun sem skilar index.html með 200 má aldrei teljast regla.
    if (/text\/html/i.test(ct) || /^\s*<(!doctype|html)/i.test(t)) return null;
    return t;
  }
  function hlada() {
    if (_gogn) return Promise.resolve(_gogn);
    if (_loadP) return _loadP;
    _loadP = (async () => {
      let grunnur = null, skra = null;
      for (const g of GRUNNAR) {
        try { const t = await saekjaTexta(g, KAFLASKRA); if (t) { skra = JSON.parse(t); grunnur = g; break; } } catch (_) {}
      }
      if (!skra || !Array.isArray(skra.kaflar)) throw new Error('Kaflaskráin (' + KAFLASKRA + ') fannst ekki');
      const nofn = new Set();
      skra.kaflar.forEach((k) => hlutarKafla(k).forEach((h) => nofn.add(h.skra)));
      const textar = {};
      await Promise.all([...nofn].map(async (n) => { try { textar[n] = await saekjaTexta(grunnur, n); } catch (_) { textar[n] = null; } }));
      _gogn = { grunnur, kaflar: skra.kaflar, textar };
      return _gogn;
    })();
    _loadP.catch(() => { _loadP = null; });
    return _loadP;
  }
  const hlutarKafla = (k) => Array.isArray(k.efni) ? k.efni.filter((e) => e && e.skra) : (k.skra ? [{ skra: k.skra, hlutar: k.hlutar, inngangur: k.inngangur }] : []);

  /* ── HLUTAR ÚR MARKDOWN-SKRÁ (eftir fyrirsögn) ──────────────────────────── */
  function fyrirsagnir(linur) {
    const ut = []; let girt = false;
    linur.forEach((l, i) => {
      if (/^\s*```/.test(l)) { girt = !girt; return; }
      if (girt) return;
      const m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l);
      if (m) ut.push({ i, stig: m[1].length, texti: m[2] });
    });
    return ut;
  }
  const klippaEnda = (arr) => { const a = arr.slice(); while (a.length && /^\s*(-{3,}|\*{3,}|_{3,})?\s*$/.test(a[a.length - 1])) a.pop(); while (a.length && !a[0].trim()) a.shift(); return a; };
  function veljaHluta(md, h) {
    const linur = String(md).replace(/\r\n?/g, '\n').split('\n');
    const fs = fyrirsagnir(linur);
    const titill = fs.find((f) => f.stig === 1);
    const fyrstaUndir = fs.find((f) => f.stig > 1);
    const upphaf = titill ? titill.i + 1 : 0;
    if (!h.hlutar || !h.hlutar.length) return { md: jafnaFyrirsagnir(klippaEnda(linur.filter((_, i) => !titill || i !== titill.i)).join('\n')), vantar: [] };
    const bitar = [], vantar = [];
    if (h.inngangur) bitar.push(klippaEnda(linur.slice(upphaf, fyrstaUndir ? fyrstaUndir.i : linur.length)).join('\n'));
    h.hlutar.forEach((p) => {
      const np = normHeiti(p);
      const k = fs.findIndex((f) => f.stig > 1 && normHeiti(f.texti).startsWith(np));
      if (k < 0) { vantar.push(p); return; }
      const f = fs[k];
      const naesta = fs.slice(k + 1).find((g) => g.stig <= f.stig);
      bitar.push(jafnaFyrirsagnir(klippaEnda(linur.slice(f.i, naesta ? naesta.i : linur.length)).join('\n')));
    });
    return { md: bitar.filter(Boolean).join('\n\n'), vantar };
  }

  /* ── MARKDOWN → HTML (lítill teiknari: fyrirsagnir, listar, töflur, tenglar, feitt, kóði) ── */
  let _xref = {};          // skráarnafn → { id, heiti } fyrsta kafla sem notar skrána
  const DAGS_RE = /\b(\d{2})\.(\d{2})\.(\d{4})\b/g;      // birt sem DD/MM/YYYY (geymt óbreytt)
  // Myndtákn (emoji) eru tekin út; textatákn (hak, hálfhringur o.fl.) eru GÖGN, t.d. í kröfutöflunni, og standa.
  const EMOJI_RE = /[\u{1F300}-\u{1FAFF}]\uFE0F?|\uFE0F/gu;
  function inl(s) {
    const geymt = [];
    const geyma = (html) => '\u0000' + (geymt.push(html) - 1) + '\u0000';
    let t = String(s);
    t = t.replace(/`([^`]+)`/g, (_, c) => {
      const m = /(?:^|\/)([a-z0-9_-]+\.(?:md|json))(?:\s|$|§)/i.exec(c + ' ');
      const x = m && _xref[m[1].toLowerCase()];
      if (x) return geyma('<button type="button" class="rg-xref" data-rg="kafli" data-v="' + esc(x.id) + '" title="' + esc(m[1]) + '">' + esc(x.heiti) + '</button>' + (/§/.test(c) ? ' ' + esc(c.slice(c.indexOf('§'))) : ''));
      return geyma('<code>' + esc(c) + '</code>');
    });
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, txt, url) => geyma('<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + inlTexti(txt) + '</a>'));
    t = t.replace(/https?:\/\/[^\s<>()\u0000]*[^\s<>().,;:!?»"“”'’)\u0000]/g, (url) => geyma('<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" class="rg-url">' + esc(url.replace(/^https?:\/\/(www\.)?/, '')) + '</a>'));
    return inlTexti(t, geymt);
  }
  function inlTexti(t, geymt) {
    let h = esc(t)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(DAGS_RE, '$1/$2/$3')
      .replace(/\u26A0\uFE0F?\s?/g, '<span class="rg-varud" title="Varúð">' + svg(IK.vidvorun, 13) + '</span>')
      .replace(EMOJI_RE, '');
    if (geymt) h = h.replace(/\u0000(\d+)\u0000/g, (_, n) => geymt[+n]);
    return h;
  }

  const LISTI_RE = /^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$/;
  const ER_HR = (l) => /^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(l);
  const ER_FYRIRS = (l) => /^#{1,6}\s+/.test(l);
  const ER_TAFLA = (linur, i) => /^\s*\|/.test(linur[i]) && i + 1 < linur.length && /^\s*\|?\s*:?-{2,}/.test(linur[i + 1]);
  const inndrattur = (l) => (/^(\s*)/.exec(l)[1] || '').replace(/\t/g, '    ').length;

  // ctx: { stigBil, iLista }
  function blokkir(linur, ctx, fyrstaErTexti) {
    let html = '', i = 0;
    while (i < linur.length) {
      const l = linur[i];
      if (!l.trim()) { i++; continue; }
      const textiSkylda = fyrstaErTexti && i === 0;
      if (!textiSkylda) {
        if (/^\s*```/.test(l)) {
          const kodi = []; i++;
          while (i < linur.length && !/^\s*```/.test(linur[i])) kodi.push(linur[i++]);
          i++;
          html += '<pre class="rg-b">' + esc(kodi.join('\n')) + '</pre>';
          continue;
        }
        const mh = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l);
        if (mh && !ctx.iLista) {
          const stig = Math.min(5, Math.max(3, mh[1].length + ctx.stigBil));
          html += '<h' + stig + ' class="rg-b rg-h" data-stig="' + stig + '">' + inl(mh[2]) + '</h' + stig + '>';
          i++; continue;
        }
        if (/^:::heimild\s/.test(l)) { html += '<p class="rg-b rg-heimild">' + inl(l.replace(/^:::heimild\s+/, '')) + '</p>'; i++; continue; }
        if (ER_HR(l)) { html += '<hr>'; i++; continue; }
        if (ER_TAFLA(linur, i)) {
          const rad = (x) => x.trim().replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
          const haus = rad(l); i += 2;
          const radir = [];
          while (i < linur.length && /^\s*\|/.test(linur[i])) radir.push(rad(linur[i++]));
          html += '<div class="rg-tafla-hjup"><table class="rg-tafla no-skin"><thead><tr>' + haus.map((c) => '<th>' + inl(c) + '</th>').join('') + '</tr></thead><tbody>' +
            radir.map((r) => '<tr class="rg-b">' + haus.map((hh, k) => '<td data-dalkur="' + esc(hh.replace(/\*\*/g, '')) + '">' + inl(r[k] == null ? '' : r[k]) + '</td>').join('') + '</tr>').join('') +
            '</tbody></table></div>';
          continue;
        }
        if (/^\s*>/.test(l)) {
          const q = [];
          while (i < linur.length && /^\s*>/.test(linur[i])) q.push(linur[i++].replace(/^\s*>\s?/, ''));
          html += '<blockquote>' + blokkir(q, ctx) + '</blockquote>';
          continue;
        }
        if (LISTI_RE.test(l)) { const r = listi(linur, i, ctx); html += r.html; i = r.i; continue; }
      }
      // málsgrein
      const p = [l.trim()]; i++;
      while (i < linur.length && linur[i].trim() && !ER_FYRIRS(linur[i]) && !ER_HR(linur[i]) && !LISTI_RE.test(linur[i]) && !ER_TAFLA(linur, i) && !/^\s*(```|>)/.test(linur[i])) p.push(linur[i++].trim());
      html += '<p' + (ctx.iLista ? '' : ' class="rg-b"') + '>' + inl(p.join(' ')) + '</p>';
    }
    return html;
  }
  function listi(linur, i, ctx) {
    const m0 = LISTI_RE.exec(linur[i]);
    const grunnInn = inndrattur(linur[i]);
    const radad = /\d/.test(m0[2]);
    const atridi = [];
    while (i < linur.length) {
      const m = LISTI_RE.exec(linur[i]);
      if (!m || inndrattur(linur[i]) !== grunnInn || /\d/.test(m[2]) !== radad) break;
      const efniInn = grunnInn + m[2].length + 1 + (/^(\s*)/.exec(linur[i].slice(grunnInn + m[2].length + 1))[1] || '').length;
      const lin = [m[3]];
      let tolu = radad ? parseInt(m[2], 10) : null;
      i++;
      while (i < linur.length) {
        const l = linur[i];
        if (!l.trim()) {
          // autt lína: atriðið heldur áfram aðeins ef næsta efnislína er inndregin
          let j = i + 1; while (j < linur.length && !linur[j].trim()) j++;
          if (j < linur.length && inndrattur(linur[j]) > grunnInn) { lin.push(''); i++; continue; }
          break;
        }
        const inn = inndrattur(l);
        if (inn > grunnInn) { lin.push(l.slice(Math.min(inn, efniInn))); i++; continue; }
        // „lazy" framhald málsgreinar
        if (!LISTI_RE.test(l) && !ER_FYRIRS(l) && !ER_HR(l) && !ER_TAFLA(linur, i) && lin[lin.length - 1].trim()) { lin.push(l.trim()); i++; continue; }
        break;
      }
      atridi.push({ lin, tolu });
      // eftir auða línu sem endaði listann
      if (i < linur.length && !linur[i].trim()) {
        let j = i; while (j < linur.length && !linur[j].trim()) j++;
        const n = j < linur.length ? LISTI_RE.exec(linur[j]) : null;
        if (n && inndrattur(linur[j]) === grunnInn && /\d/.test(n[2]) === radad) { i = j; continue; }
        break;
      }
    }
    const tag = radad ? 'ol' : 'ul';
    const start = radad && atridi[0] && atridi[0].tolu !== 1 ? ' start="' + atridi[0].tolu + '"' : '';
    const innri = Object.assign({}, ctx, { iLista: true });
    const html = '<' + tag + start + '>' + atridi.map((a) => {
      const thett = a.lin.every((x) => x.trim()) && !a.lin.slice(1).some((x) => LISTI_RE.test(x) || /^\s*\|/.test(x));
      const inni = thett ? inl(a.lin.map((x) => x.trim()).join(' ')) : blokkir(a.lin, innri, true);
      return '<li class="rg-b">' + inni + '</li>';
    }).join('') + '</' + tag + '>';
    return { html, i };
  }

  /* ── KAFLI → HTML ───────────────────────────────────────────────────────── */
  function kaflaMd(k, textar) {
    const parts = [], vantar = [];
    let fannst = false;
    hlutarKafla(k).forEach((h) => {
      const t = textar[h.skra];
      if (t == null) { vantar.push('skráin ' + h.skra); return; }
      fannst = true;
      const r = veljaHluta(t, h);
      r.vantar.forEach((v) => vantar.push('„' + v + '“ í ' + h.skra));
      if (r.md) parts.push(r.md);
    });
    let md = parts.join('\n\n');
    // Fyrsta fyrirsögn = heiti kaflans (+ heimildir í sviga) → heimildarlína, ekki tvítekinn titill.
    const linur = md.split('\n');
    const f0 = linur.findIndex((l) => l.trim());
    const mh = f0 >= 0 ? /^(#{1,6})\s+(.*?)\s*$/.exec(linur[f0]) : null;
    if (mh && normHeiti(mh[2]).startsWith(normHeiti(k.heiti))) {
      const rest = mh[2].slice(k.heiti.length).trim();
      const sv = /^\((.*)\)$/.exec(rest);
      if (!rest) linur.splice(f0, 1);
      else if (sv) linur[f0] = ':::heimild ' + sv[1];
      md = linur.join('\n');
    }
    return { md, fannst, vantar, stigBil: 0 };
  }
  // Grynnsta fyrirsögn HVERS hluta verður h3 (kaflaheitið sjálft er h2 í málmhausnum), undirfyrirsagnir þar undir.
  function jafnaFyrirsagnir(md) {
    const linur = md.split('\n');
    const fs = fyrirsagnir(linur);
    if (!fs.length) return md;
    const minnst = Math.min.apply(null, fs.map((f) => f.stig));
    fs.forEach((f) => { linur[f.i] = '#'.repeat(Math.min(5, f.stig - minnst + 3)) + ' ' + f.texti; });
    return linur.join('\n');
  }

  /* ── ÁSTAND (í breytum, ekki í DOM) ─────────────────────────────────────── */
  let leit = '', _virkur = null, _teiknad = false, _villa = null;
  let _blokkir = [], _kaflar = [];   // fyllt eftir teikningu

  /* ── CSS ───────────────────────────────────────────────────────────────── */
  function css() {
    const V = 'html body #' + VIEW_ID;
    const R = V + ' #_rg449-root';
    return [
      V + '{display:none;min-height:100vh;background:#e2e6ec;background-image:' + STAL_IMG + ';font-family:' + SANS + ';color:#1f2530;padding:0 0 80px!important;max-width:none!important;box-sizing:border-box}',
      V + ' *{box-sizing:border-box}',
      V + '{overflow-x:hidden!important}',
      R + ' [hidden]{display:none!important}',
      R + '{container-type:inline-size;container-name:rg}',
      // Málmhaus með hnoðum
      R + ' .rg-haus{position:relative;display:flex;align-items:center;gap:14px;min-height:64px;padding:8px 26px;background:' + METAL + ';border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);color:#fff}',
      R + ' .rg-haus::before,' + R + ' .rg-haus::after,' + R + ' .rg-kh::before,' + R + ' .rg-kh::after{content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7)}',
      R + ' .rg-haus::before{left:9px}' + R + ' .rg-haus::after{right:9px}',
      R + ' .rg-tt{font-family:' + DISP + ';font-weight:800;font-size:26px;line-height:1;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      R + ' .rg-st{font-family:' + MONO + ';font-size:11px;color:#aab2c0;margin-top:5px;letter-spacing:.04em}',
      R + ' .rg-tala{margin-left:auto;display:flex;align-items:baseline;justify-content:flex-end;gap:8px;min-width:120px}',
      R + ' .rg-tala b{font-family:' + DISP + ';font-weight:800;font-size:34px;line-height:1;color:#fff;font-variant-numeric:lining-nums}',
      R + ' .rg-tala span{font-family:' + DISP + ';font-weight:700;font-size:15px;color:#cfd5de}',
      // Leitarstika — límist efst
      R + ' .rg-stika{position:sticky;top:0;z-index:6;display:flex;align-items:center;gap:10px;height:64px;padding:0 22px;background:#dfe3ea;background-image:' + STAL_IMG + ';border-bottom:1px solid rgba(20,24,34,.14);box-shadow:0 6px 14px -12px rgba(10,14,22,.55)}',
      R + ' .rg-leitbox{position:relative;flex:0 1 560px;min-width:0}',
      R + ' .rg-leitbox svg{position:absolute;left:12px;top:50%;margin-top:-8px;color:#6b7483;pointer-events:none}',
      R + ' input.rg-leit{display:block;width:100%!important;height:40px!important;margin:0!important;padding:0 176px 0 38px!important;border-radius:8px!important;background:#eef1f6!important;border:1px solid rgba(20,24,34,.14)!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)!important;font:15px ' + SANS + '!important;color:#141822!important;-webkit-appearance:none;appearance:none}',
      R + ' .rg-leit:focus{outline:2px solid #971515;outline-offset:1px}',
      R + ' .rg-leit::-webkit-search-cancel-button{display:none}',
      R + ' .rg-fjoldi{position:absolute;right:12px;top:50%;transform:translateY(-50%);max-width:170px;font:500 12px ' + MONO + ';color:#3a4250;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}',
      R + ' .rg-fjoldi .s{display:none}',
      R + ' .rg-raema{display:none}',
      R + ' .rg-takki{flex:none;display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 14px;border-radius:9px;font:600 13.5px ' + SANS + ';cursor:pointer;background:' + SILVER + ';border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530}',
      R + ' .rg-takki[disabled]{opacity:.38;pointer-events:none}',
      R + ' .rg-stika .rg-takki{margin-left:auto}',
      // Fyrirvarinn
      R + ' .rg-fyrirvari{display:flex;align-items:center;gap:10px;margin:14px 22px 0;padding:10px 14px;background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);font-size:13.5px;line-height:1.45;color:#1f2530}',
      R + ' .rg-fyrirvari .rg-plata{flex:none}',
      R + ' .rg-plata{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12);font:700 10.5px ' + MONO + ';letter-spacing:.06em;text-transform:uppercase;color:#1f2530;white-space:nowrap}',
      R + ' .rg-plata._dokk{background:' + DARK_PLATE + ';border-color:#000;color:#eef1f4}',
      // Grind: efnisyfirlit + stálplata
      R + ' .rg-grind{display:grid;grid-template-columns:250px minmax(0,1060px);gap:16px;align-items:start;padding:14px 22px 0}',
      R + ' .rg-efni{position:sticky;top:76px;max-height:calc(100vh - 92px);overflow:auto;padding:10px 8px 12px;border-radius:14px;border:1px solid #000;background:#cfd5de;background-image:' + STAL_IMG + ';box-shadow:0 10px 30px -10px rgba(10,14,22,.45)}',
      R + ' .rg-efni-tt{padding:2px 8px 8px;font:700 10.5px ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#3a4250}',
      R + ' .rg-efni-listi{display:flex;flex-direction:column;gap:3px}',
      R + ' .rg-el{display:flex;align-items:center;gap:9px;width:100%;min-height:40px;padding:6px 8px;border-radius:9px;border:1px solid transparent;background:transparent;text-align:left;cursor:pointer;font:500 13.5px/1.25 ' + SANS + ';color:#1f2530}',
      R + ' .rg-el:hover{background:rgba(255,255,255,.55)}',
      R + ' .rg-el .n{flex:none;width:26px;height:22px;display:inline-flex;align-items:center;justify-content:center;border-radius:3px;background:' + SILVER + ';border:1px solid rgba(20,24,34,.14);font:700 10.5px ' + MONO + ';color:#3a4250}',
      R + ' .rg-el .t{flex:1 1 auto;min-width:0}',
      R + ' .rg-el .c{flex:none;min-width:24px;font:700 10.5px ' + MONO + ';color:#3a4250;text-align:right}',
      R + ' .rg-el[aria-current="true"]{background:#fff;border-color:rgba(20,24,34,.16);box-shadow:0 1px 2px rgba(0,0,0,.12)}',
      R + ' .rg-el[aria-current="true"] .n{background:' + DARK_PLATE + ';border-color:#000;color:#eef1f4}',
      R + ' .rg-el._tomt{opacity:.45}',
      R + ' .rg-plotu{min-width:0;padding:12px 12px 16px;border-radius:14px;border:1px solid #000;background:#cfd5de;background-image:' + STAL_IMG + ';box-shadow:0 10px 30px -10px rgba(10,14,22,.45);display:flex;flex-direction:column;gap:14px;min-height:60vh}',
      R + ' .rg-hledur,' + R + ' .rg-tomt{padding:22px;text-align:center;font-size:14px;color:#3a4250}',
      // Stálspjald = kafli
      R + ' .rg-kafli{background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);overflow:hidden;min-width:0}',
      R + ' .rg-kh{position:relative;display:flex;align-items:center;gap:12px;min-height:52px;padding:6px 20px 6px 22px;background:' + METAL + ';border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}',
      R + ' .rg-kh::before{left:8px}' + R + ' .rg-kh::after{right:8px}',
      R + ' .rg-kh .n{flex:none;font:700 11px ' + MONO + ';letter-spacing:.08em;color:#aab2c0}',
      R + ' .rg-kh h2{margin:0;min-width:0;font-family:' + DISP + ';font-weight:800;font-size:21px;line-height:1.15;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      R + ' .rg-kh .rg-plata{margin-left:auto}',
      R + ' .rg-buk{padding:14px 20px 18px;font-size:14.5px;line-height:1.6;color:#1f2530}',
      R + ' .rg-buk > :first-child{margin-top:0}',
      R + ' .rg-buk p{margin:0 0 10px;max-width:78ch}',
      R + ' .rg-buk ul,' + R + ' .rg-buk ol{margin:0 0 12px;padding-left:22px;max-width:80ch}',
      R + ' .rg-buk li{margin:3px 0}',
      R + ' .rg-buk li > p{margin:0 0 4px}',
      R + ' .rg-buk li > ul,' + R + ' .rg-buk li > ol{margin:4px 0 6px}',
      R + ' .rg-buk ul > li::marker{color:#6b7483}',
      R + ' .rg-buk ol > li::marker{font:600 13px ' + MONO + ';color:#3a4250}',
      R + ' .rg-buk strong{font-weight:600;color:#141822}',
      R + ' .rg-buk h3{margin:22px 0 8px!important;padding:0 0 6px!important;border-bottom:1px solid rgba(20,24,34,.12)!important;font:700 19px/1.3 ' + DISP + '!important;letter-spacing:0!important;text-transform:none!important;color:#141822!important}',
      R + ' .rg-buk h4{margin:18px 0 6px!important;padding:0!important;border:0!important;font:600 15.5px/1.35 ' + SANS + '!important;letter-spacing:0!important;text-transform:none!important;color:#141822!important}',
      R + ' .rg-buk h5{margin:12px 0 4px!important;padding:0!important;border:0!important;font:700 11px/1.45 ' + MONO + '!important;letter-spacing:.14em!important;text-transform:uppercase!important;color:#3a4250!important}',
      R + ' .rg-buk hr{border:0;border-top:1px dashed rgba(20,24,34,.18);margin:14px 0}',
      R + ' .rg-buk code{font:12.5px ' + MONO + ';background:#eef1f6;border:1px solid rgba(20,24,34,.1);border-radius:4px;padding:0 4px;color:#1f2530;overflow-wrap:anywhere}',
      R + ' .rg-buk pre{margin:0 0 12px;padding:10px 12px;background:#f4f6f9;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12);font:12.5px/1.5 ' + MONO + ';white-space:pre-wrap;overflow-wrap:anywhere}',
      R + ' .rg-buk blockquote{margin:0 0 12px;padding:8px 14px;background:#f4f6f9;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.1)}',
      R + ' .rg-buk a{color:#141822;text-decoration:underline;text-decoration-color:rgba(20,24,34,.35);text-decoration-thickness:1px;text-underline-offset:2px;overflow-wrap:anywhere}',
      R + ' .rg-buk a:hover{color:#8f1d13;text-decoration-color:currentColor}',
      R + ' .rg-buk a:focus-visible,' + R + ' .rg-xref:focus-visible,' + R + ' .rg-el:focus-visible,' + R + ' .rg-takki:focus-visible{outline:2px solid #971515;outline-offset:2px}',
      R + ' .rg-buk a.rg-url{font:12.5px ' + MONO + '}',
      R + ' .rg-xref{display:inline;padding:0;margin:0;border:0;background:none;font:inherit;font-weight:600;color:#141822;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px;cursor:pointer}',
      R + ' .rg-xref:hover{color:#8f1d13}',
      R + ' .rg-heimild{margin:0 0 12px!important;padding:6px 10px;background:#f4f6f9;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.1);font:500 12px/1.5 ' + MONO + '!important;color:#3a4250;max-width:none!important}',
      R + ' .rg-varud{display:inline-flex;vertical-align:-2px;color:#845400;margin-right:6px}',
      R + ' .rg-vantar{margin:0 0 10px;font:500 12px ' + MONO + ';color:#b42318}',
      R + ' .rg-uppruni{margin-top:14px;padding-top:8px;border-top:1px dashed rgba(20,24,34,.16);font:500 11px ' + MONO + ';color:#6b7483}',
      // Tafla C
      R + ' .rg-tafla-hjup{margin:0 0 14px;max-width:100%;overflow-x:auto}',
      R + ' .rg-tafla{width:100%!important;min-width:0!important;display:table!important;border-collapse:separate!important;border-spacing:0!important;background:#fff;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);overflow:hidden;font-size:13.5px;line-height:1.5}',
      R + ' .rg-tafla th{background:' + METAL + '!important;color:#cfd5de!important;font:700 10.5px ' + MONO + '!important;letter-spacing:.08em!important;text-transform:uppercase!important;text-align:left!important;padding:9px 10px!important;vertical-align:bottom!important;white-space:normal!important;border:0!important}',
      R + ' .rg-tafla td{padding:9px 10px!important;border:0!important;border-top:1px solid rgba(20,24,34,.08)!important;vertical-align:top!important;white-space:normal!important;background:#fff!important;font:400 13.5px/1.5 ' + SANS + '!important;color:#1f2530!important;text-align:left!important;height:auto!important}',
      R + ' .rg-tafla tr{background:#fff!important;height:auto!important}',
      // Eldri töfluhjúpar appsins setja tbody/tr í block — þá teygjast raðirnar ekki yfir breiddina
      R + ' .rg-tafla thead{display:table-header-group!important}' + R + ' .rg-tafla tbody{display:table-row-group!important}' +
        R + ' .rg-tafla tr{display:table-row!important}' + R + ' .rg-tafla th,' + R + ' .rg-tafla td{display:table-cell!important}',
      R + ' .rg-tafla td:first-child{font-weight:600!important;color:#141822!important}',
      R + ' .rg-tafla td strong{font-weight:700}',
      // Leit
      '::highlight(rg-leit){background-color:rgba(211,171,78,.55);color:#141822}',
      // Sími og þröngt (gámur, ekki skjár: hliðarstikan tekur sitt)
      '@container rg (max-width: 760px){' +
        R + ' .rg-haus{padding:8px 18px 8px 20px;min-height:58px}' + R + ' .rg-tt{font-size:23px}' + R + ' .rg-st{font-size:10.5px}' +
        R + ' .rg-tala{min-width:84px}' + R + ' .rg-tala b{font-size:26px}' + R + ' .rg-tala span{font-size:13px}' +
        R + ' .rg-stika{height:auto;flex-wrap:wrap;padding:10px 12px 0;gap:8px}' +
        R + ' .rg-leitbox{flex:1 1 0}' + R + ' input.rg-leit{height:44px!important;font-size:16px!important;padding-right:84px!important}' +
        R + ' .rg-fjoldi{max-width:72px}' + R + ' .rg-fjoldi .l{display:none}' + R + ' .rg-fjoldi .s{display:inline}' +
        R + ' .rg-stika .rg-takki{margin-left:0;height:44px;padding:0 12px}' +
        R + ' .rg-raema{display:block;flex:1 1 100%;min-width:0;max-width:calc(100% + 24px);margin:0 -12px;height:50px}' +
        R + ' .rg-grind{grid-template-columns:minmax(0,1fr);padding:10px 10px 0;gap:10px}' +
        R + ' .rg-efni{display:none}' +
        R + ' .rg-raema .rg-efni-listi{min-width:0;max-width:100%;flex-direction:row;gap:6px;overflow-x:auto;overflow-y:hidden;height:50px;padding:0 12px 10px;scrollbar-width:none;-webkit-overflow-scrolling:touch}' +
        R + ' .rg-raema .rg-efni-listi::-webkit-scrollbar{display:none}' +
        R + ' .rg-el{flex:none;width:auto;min-height:40px;padding:0 12px 0 6px;background:' + SILVER + ';border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);white-space:nowrap}' +
        R + ' .rg-el[aria-current="true"]{background:' + DARK_PLATE + ';border-color:#000;color:#eef1f4}' +
        R + ' .rg-el .c:empty{display:none}' +
        R + ' .rg-fyrirvari{margin:10px 10px 0;font-size:13px;align-items:flex-start}' +
        R + ' .rg-plotu{padding:8px 8px 12px;gap:10px;border-radius:12px}' +
        R + ' .rg-kh{padding:6px 16px 6px 18px}' + R + ' .rg-kh h2{font-size:19px}' +
        R + ' .rg-buk{padding:12px 14px 16px;font-size:15px}' +
        R + ' .rg-buk ul,' + R + ' .rg-buk ol{padding-left:20px}' +
      '}',
      // Töflur staflast (merki dálks ofan við gildið) aðeins þar sem þær komast ekki fyrir — á síma
      '@container rg (max-width: 560px){' +
        R + ' .rg-tafla-hjup{overflow:visible}' +
        R + ' .rg-tafla,' + R + ' .rg-tafla tbody,' + R + ' .rg-tafla tr,' + R + ' .rg-tafla td{display:block!important;width:100%}' +
        R + ' .rg-tafla thead{display:none!important}' +
        R + ' .rg-tafla tr{padding:8px 12px;border-top:1px solid rgba(20,24,34,.1)}' +
        R + ' .rg-tafla tr:first-child{border-top:0}' +
        R + ' .rg-tafla td{padding:2px 0!important;border:0!important}' +
        R + ' .rg-tafla td[data-dalkur]:not([data-dalkur=""])::before{content:attr(data-dalkur);display:block;font:700 10px ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#6b7483;margin-top:4px}' +
        R + ' .rg-tafla td:first-child::before{margin-top:0}' +
      '}',
      // Falið í leit — SÍÐAST og sterkara en display-reglur töflunnar (tr/td bera display með !important)
      R + ' .rg-x,' + R + ' .rg-tafla tr.rg-x,' + R + ' .rg-buk .rg-tafla-hjup.rg-x{display:none!important}',
      // Stikan límist ekki á mjög lágum skjá (lárétt sími) — þá étur hún skjáinn
      '@media (max-height: 520px){' + R + ' .rg-stika{position:static}' + R + ' .rg-efni{position:static;max-height:none}' + '}',
    ].join('\n');
  }
  function injectCss() {
    if (!document.getElementById('_rg449-font')) {
      const lf = document.createElement('link');
      lf.id = '_rg449-font'; lf.rel = 'stylesheet';
      lf.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap';
      (document.head || document.documentElement).appendChild(lf);
    }
    if (document.getElementById('_rg449-css')) return;
    const st = document.createElement('style'); st.id = '_rg449-css'; st.textContent = css();
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── TEIKNING ──────────────────────────────────────────────────────────── */
  const tvistafa = (n) => String(n).padStart(2, '0');
  const beygjaKafla = (n) => (n % 10 === 1 && n % 100 !== 11) ? 'kafli' : 'kaflar';
  const beygjaLinu = (n) => (n % 10 === 1 && n % 100 !== 11) ? 'lína' : 'línur';

  function grindHtml() {
    return '<header class="rg-haus"><div><div class="rg-tt">Reglur</div><div class="rg-st">Brunavarnabúnaður · lög, reglugerðir og leiðbeiningar</div></div>' +
        '<div class="rg-tala"><b data-rg-tala></b><span data-rg-tala-ord></span></div></header>' +
      '<div class="rg-stika">' +
        '<div class="rg-leitbox">' + svg(IK.leit) + '<input type="search" class="rg-leit" data-rg-leit placeholder="Leita, t.d. lux, 9.4.12, stigahús" aria-label="Leita í reglunum" autocomplete="off" spellcheck="false" enterkeyhint="search">' +
          '<span class="rg-fjoldi" aria-live="polite"><span class="l" data-rg-fjoldi></span><span class="s" data-rg-fjoldi-s aria-hidden="true"></span></span></div>' +
        '<button type="button" class="rg-takki" data-rg="hreinsa" disabled>Hreinsa</button>' +
        // Í síma: efnisyfirlitið sem lárétt ræma INNI í límdu stikunni (hæðin frátekin áður en kaflarnir koma)
        '<nav class="rg-raema" aria-label="Kaflar"><div class="rg-efni-listi" data-rg-efni></div></nav>' +
      '</div>' +
      '<div class="rg-fyrirvari" role="note"><span class="rg-plata _dokk">' + svg(IK.upplys, 12) + 'Fyrirvari</span><span>' + esc(FYRIRVARI) + '</span></div>' +
      '<div class="rg-grind">' +
        '<nav class="rg-efni" aria-label="Efnisyfirlit"><div class="rg-efni-tt">Efnisyfirlit</div><div class="rg-efni-listi" data-rg-efni></div></nav>' +
        '<div class="rg-plotu" data-rg-plotu><div class="rg-hledur">Hleður reglum…</div></div>' +
      '</div>';
  }

  function efniHtml(gogn) {
    // Skráarnafn → fyrsti kafli sem notar hana (krossvísanir í textanum verða tenglar á kaflann)
    _xref = {};
    const synd = [];
    gogn.kaflar.forEach((k) => {
      if (!k || !k.id || !k.heiti) return;
      const r = kaflaMd(k, gogn.textar);
      if (!r.fannst && k.valkvaett) return;           // valkvæður kafli án skrár — ekki sýndur, engin villa
      synd.push({ k, r });
      hlutarKafla(k).forEach((h) => { const n = h.skra.toLowerCase(); if (!_xref[n] && gogn.textar[h.skra] != null) _xref[n] = { id: k.id, heiti: k.heiti }; });
    });
    const efni = synd.map((x, n) => '<button type="button" class="rg-el" data-rg="kafli" data-v="' + esc(x.k.id) + '" aria-current="false"><span class="n">' + tvistafa(n + 1) + '</span><span class="t">' + esc(x.k.heiti) + '</span><span class="c" data-rg-c></span></button>').join('');
    const kaflar = synd.map((x, n) => {
      const ctx = { stigBil: x.r.stigBil, iLista: false };
      const vantar = x.r.vantar.length ? '<p class="rg-vantar">Fannst ekki: ' + esc(x.r.vantar.join(' · ')) + '</p>' : '';
      const skrar = [...new Set(hlutarKafla(x.k).map((h) => h.skra))].join(' · ');
      return '<section class="rg-kafli" id="rg-' + esc(x.k.id) + '" data-rg-kafli="' + esc(x.k.id) + '" aria-labelledby="rg-h-' + esc(x.k.id) + '">' +
        '<header class="rg-kh"><span class="n">' + tvistafa(n + 1) + '</span><h2 id="rg-h-' + esc(x.k.id) + '">' + esc(x.k.heiti) + '</h2><span class="rg-plata" data-rg-kc hidden></span></header>' +
        '<div class="rg-buk">' + vantar + blokkir(x.r.md.split('\n'), ctx) + '<div class="rg-uppruni">Úr ' + esc(skrar) + '</div></div></section>';
    }).join('');
    return { efni, kaflar, fjoldi: synd.length };
  }

  function teikna() {
    const v = document.getElementById(VIEW_ID);
    if (!v) return;
    const root = v.querySelector('#_rg449-root');
    if (!root.firstChild) root.innerHTML = grindHtml();
    if (_teiknad) return;
    const plata = root.querySelector('[data-rg-plotu]');
    if (_villa) {
      const t = '<div class="rg-tomt">Reglurnar náðust ekki: ' + esc(_villa) + '<div style="margin-top:12px"><button type="button" class="rg-takki" data-rg="reyna">Reyna aftur</button></div></div>';
      if (plata.innerHTML !== t) plata.innerHTML = t;
      return;
    }
    if (!_gogn) return;
    const h = efniHtml(_gogn);
    root.querySelectorAll('[data-rg-efni]').forEach((l) => { l.innerHTML = h.efni; });
    plata.innerHTML = h.kaflar || '<div class="rg-tomt">Engir kaflar í kaflaskránni.</div>';
    const b = root.querySelector('[data-rg-tala]'), o = root.querySelector('[data-rg-tala-ord]');
    b.textContent = String(h.fjoldi); o.textContent = beygjaKafla(h.fjoldi);
    _teiknad = true;
    skraBlokkir(root);
    beitaLeit();
    merkjaVirkan();
  }

  /* ── LEIT ───────────────────────────────────────────────────────────────── */
  function eiginTexti(el) {
    // texti hnútsins sjálfs, án undirblokka (undirlista í li o.s.frv.)
    let s = '';
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && n.parentElement.closest('.rg-b') === el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    let n; while ((n = w.nextNode())) s += n.nodeValue;
    return s;
  }
  function skraBlokkir(root) {
    _blokkir = []; _kaflar = [];
    root.querySelectorAll('.rg-kafli').forEach((sec) => {
      const kaf = { el: sec, id: sec.dataset.rgKafli, heiti: norm(sec.querySelector('.rg-kh h2').textContent), blokkir: [], toflur: [], efni: [...root.querySelectorAll('.rg-el[data-v="' + sec.dataset.rgKafli + '"]')] };
      const buk = sec.querySelector('.rg-buk');
      const kort = new Map();
      buk.querySelectorAll('.rg-b').forEach((el) => {
        const own = eiginTexti(el);
        const foreldri = el.parentElement.closest('.rg-b');
        const b = { el, own: norm(own), foreldri: foreldri ? kort.get(foreldri) : null, h: el.classList.contains('rg-h') ? +el.dataset.stig : 0, born: [], textanodar: [] };
        if (b.foreldri) b.foreldri.born.push(b);
        kort.set(el, b);
        kaf.blokkir.push(b);
      });
      // textahnútar fyrir hápunkta (stöðluð afrit geymd svo leitin þurfi ekki að staðla aftur)
      const w = document.createTreeWalker(buk, NodeFilter.SHOW_TEXT);
      let n; while ((n = w.nextNode())) { const bl = n.parentElement && n.parentElement.closest('.rg-b'); const b = bl && kort.get(bl); if (b) b.textanodar.push({ n, s: norm(n.nodeValue) }); }
      // fyrirsagnir: hver blokk veit undir hvaða fyrirsögnum hún stendur
      const stafli = [];
      kaf.blokkir.forEach((b) => {
        if (b.h) { while (stafli.length && stafli[stafli.length - 1].h >= b.h) stafli.pop(); b.fyrirs = stafli.slice(); stafli.push(b); b.undir = []; return; }
        b.fyrirs = stafli.slice();
        stafli.forEach((f) => f.undir.push(b));
      });
      kaf.blokkir.forEach((b) => {
        let s = kaf.heiti + ' ' + (b.fyrirs || []).map((f) => f.own).join(' ');
        for (let f = b.foreldri; f; f = f.foreldri) s += ' ' + f.own;
        b.samhengi = s;
      });
      buk.querySelectorAll('.rg-tafla-hjup').forEach((t) => kaf.toflur.push({ el: t, radir: [...t.querySelectorAll('tbody tr')].map((tr) => kort.get(tr)).filter(Boolean) }));
      // Ílát (tilvitnun, listi) hverfa með innihaldinu — annars stendur tómur kassi eftir í leitinni
      kaf.ilat = [...buk.querySelectorAll('blockquote, ul, ol')].map((el) => ({ el, born: [...el.querySelectorAll('.rg-b')].map((x) => kort.get(x)).filter(Boolean) }));
      kaf.skil = [...buk.querySelectorAll('hr')];
      _kaflar.push(kaf);
    });
  }
  const setja = (el, cls, a) => { if (el && el.classList.contains(cls) !== a) el.classList.toggle(cls, a); };
  const setjaTexta = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  function ordLeitar(q) { return norm(q).replace(/[„“”"]/g, ' ').split(/\s+/).filter(Boolean); }

  function beitaLeit() {
    const root = document.querySelector('#' + VIEW_ID + ' #_rg449-root');
    if (!root || !_teiknad) return;
    const ord = ordLeitar(leit);
    const ranges = [];
    let alls = 0, kaflarMed = 0;
    _kaflar.forEach((kaf) => {
      let fjoldi = 0, synilegt = false;
      if (!ord.length) {
        kaf.blokkir.forEach((b) => setja(b.el, 'rg-x', false));
        kaf.toflur.forEach((t) => setja(t.el, 'rg-x', false));
        kaf.ilat.forEach((t) => setja(t.el, 'rg-x', false));
        kaf.skil.forEach((el) => setja(el, 'rg-x', false));
        setja(kaf.el, 'rg-x', false);
      } else {
        const allurKafli = ord.every((o) => kaf.heiti.includes(o));
        const synd = new Set();
        const passa = [];
        kaf.blokkir.forEach((b) => {
          const beint = ord.some((o) => b.own.includes(o)) && ord.every((o) => b.own.includes(o) || b.samhengi.includes(o));
          if (!beint) return;
          passa.push(b);
          if (!b.h) fjoldi++;
        });
        const syna = (b) => { if (synd.has(b)) return; synd.add(b); b.born.forEach(syna); };
        if (allurKafli) kaf.blokkir.forEach((b) => synd.add(b));
        passa.forEach((b) => {
          syna(b);
          if (b.h) b.undir.forEach(syna);
          for (let f = b.foreldri; f; f = f.foreldri) synd.add(f);
        });
        // fyrirsögn sést ef eitthvað undir henni sést
        kaf.blokkir.forEach((b) => { if (b.h && !synd.has(b) && b.undir.some((u) => synd.has(u))) synd.add(b); });
        kaf.blokkir.forEach((b) => setja(b.el, 'rg-x', !synd.has(b)));
        kaf.toflur.forEach((t) => setja(t.el, 'rg-x', !t.radir.some((r) => synd.has(r))));
        kaf.ilat.forEach((t) => setja(t.el, 'rg-x', !t.born.some((r) => synd.has(r))));
        kaf.skil.forEach((el) => setja(el, 'rg-x', !allurKafli));
        synilegt = synd.size > 0;
        setja(kaf.el, 'rg-x', !synilegt);
        // hápunktar: aðeins orðin í línunum sem pössuðu
        passa.forEach((b) => b.textanodar.forEach((tn) => ord.forEach((o) => {
          let k = tn.s.indexOf(o);
          while (k >= 0) { try { const r = new Range(); r.setStart(tn.n, k); r.setEnd(tn.n, k + o.length); ranges.push(r); } catch (_) {} k = tn.s.indexOf(o, k + o.length); }
        })));
        if (allurKafli && !fjoldi) fjoldi = kaf.blokkir.filter((b) => !b.h).length;
      }
      alls += fjoldi; if (ord.length && synilegt) kaflarMed++;
      kaf.efni.forEach((e) => { setjaTexta(e.querySelector('[data-rg-c]'), ord.length && fjoldi ? String(fjoldi) : ''); setja(e, '_tomt', !!ord.length && !synilegt); });
      const kc = kaf.el.querySelector('[data-rg-kc]');
      if (kc) { setjaTexta(kc, ord.length && fjoldi ? fjoldi + ' ' + beygjaLinu(fjoldi) : ''); const fela = !(ord.length && fjoldi); if (kc.hidden !== fela) kc.hidden = fela; }
    });
    try {
      if (window.CSS && CSS.highlights && window.Highlight) {
        if (ranges.length) CSS.highlights.set('rg-leit', new Highlight(...ranges)); else CSS.highlights.delete('rg-leit');
      }
    } catch (_) {}
    const plata = root.querySelector('[data-rg-plotu]');
    let tomt = plata.querySelector(':scope > .rg-tomt[data-rg-ekkert]');
    const ekkert = !!ord.length && !kaflarMed;
    if (ekkert && !tomt) { tomt = document.createElement('div'); tomt.className = 'rg-tomt'; tomt.setAttribute('data-rg-ekkert', ''); plata.appendChild(tomt); }
    if (tomt) { setjaTexta(tomt, ekkert ? 'Ekkert fannst fyrir „' + leit.trim() + '“.' : ''); setja(tomt, 'rg-x', !ekkert); }
    setjaTexta(root.querySelector('[data-rg-fjoldi]'), !ord.length ? '' : (kaflarMed ? alls + ' ' + beygjaLinu(alls) + ' í ' + kaflarMed + ' ' + (kaflarMed === 1 ? 'kafla' : 'köflum') : 'Ekkert fannst'));
    setjaTexta(root.querySelector('[data-rg-fjoldi-s]'), !ord.length ? '' : (kaflarMed ? alls + ' ' + beygjaLinu(alls) : 'Ekkert'));
    const hr = root.querySelector('[data-rg="hreinsa"]');
    if (hr && hr.disabled !== !leit) hr.disabled = !leit;
  }

  /* ── HOPP Í KAFLA + HVAR ER ÉG ─────────────────────────────────────────── */
  function hoppa(id) {
    const sec = document.getElementById('rg-' + id);
    if (!sec) return;
    if (sec.classList.contains('rg-x')) { leit = ''; const inp = document.querySelector('#' + VIEW_ID + ' [data-rg-leit]'); if (inp) inp.value = ''; beitaLeit(); }
    skrunaUndirStiku(sec);
    _virkur = id; merkjaVirkan(true);
    const h = sec.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (_) {} }
  }
  // Kafli lendir rétt undir límdu stikunni. Síðan (view) skrunar sjálf og ber padding fyrir borðann, svo
  // scroll-margin dugar ekki — mælt eftir á og leiðrétt í SAMA tifi (enginn millirammi málast).
  function skrunaUndirStiku(el) {
    // Aðeins lóðrétt — scrollIntoView gæti líka hliðrað síðunni.
    // Tvær umferðir: stikan límist fyrst EFTIR fyrsta skrunið (efst á síðunni liggur hún neðar), svo staða hennar
    // er mæld aftur og leiðrétt. Allt í sama tifi — enginn millirammi málast.
    const stika = document.querySelector('#' + VIEW_ID + ' .rg-stika');
    let s = el.parentElement;
    while (s && s !== document.body && !(s.scrollHeight > s.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(s).overflowY))) s = s.parentElement;
    for (let umferd = 0; umferd < 2; umferd++) {
      const efst = stika ? stika.getBoundingClientRect().bottom + 12 : 12;
      const munur = el.getBoundingClientRect().top - efst;
      if (Math.abs(munur) < 1) return;
      if (s && s !== document.body) s.scrollTop += munur; else window.scrollBy(0, munur);
    }
  }
  function merkjaVirkan(fast) {
    const root = document.querySelector('#' + VIEW_ID + ' #_rg449-root');
    if (!root || !_teiknad) return;
    if (!fast) {
      const efst = (root.querySelector('.rg-stika') || root).getBoundingClientRect().bottom + 24;
      let id = null;
      for (const kaf of _kaflar) {
        if (kaf.el.classList.contains('rg-x')) continue;
        if (!id) id = kaf.id;
        if (kaf.el.getBoundingClientRect().top <= efst) id = kaf.id; else break;
      }
      _virkur = id;
    }
    root.querySelectorAll('.rg-el').forEach((b) => { const a = String(b.dataset.v === _virkur); if (b.getAttribute('aria-current') !== a) b.setAttribute('aria-current', a); });
    // Í síma er efnisyfirlitið lárétt ræma — láttu virka kaflann sjást í henni
    const listi = root.querySelector('.rg-raema [data-rg-efni]');
    const virkurTakki = listi && listi.querySelector('.rg-el[aria-current="true"]');
    if (virkurTakki && listi && listi.scrollWidth > listi.clientWidth + 4) {
      const l = virkurTakki.offsetLeft - 10, r = virkurTakki.offsetLeft + virkurTakki.offsetWidth + 10;
      if (l < listi.scrollLeft || r > listi.scrollLeft + listi.clientWidth) listi.scrollLeft = Math.max(0, l);
    }
  }
  let _skrunRaf = 0;
  function aSkruni() {
    if (_skrunRaf) return;
    _skrunRaf = requestAnimationFrame(() => { _skrunRaf = 0; const v = document.getElementById(VIEW_ID); if (v && v.classList.contains('active')) merkjaVirkan(); });
  }

  /* ── ATBURÐIR ──────────────────────────────────────────────────────────── */
  let _leitTof = 0;
  function ensureView() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div');
    v.id = VIEW_ID; v.className = 'view'; v.style.display = 'none';
    v.innerHTML = '<div id="_rg449-root"></div>';
    v.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rg]'); if (!b || !v.contains(b)) return;
      const a = b.dataset.rg;
      if (a === 'kafli') { e.preventDefault(); hoppa(b.dataset.v); return; }
      if (a === 'hreinsa') { leit = ''; const inp = v.querySelector('[data-rg-leit]'); if (inp) { inp.value = ''; inp.focus(); } beitaLeit(); return; }
      if (a === 'reyna') { _villa = null; opna(); }
    });
    v.addEventListener('input', (e) => {
      const s = e.target.closest('[data-rg-leit]'); if (!s) return;
      const var_ = leit;
      leit = s.value;
      clearTimeout(_leitTof);
      _leitTof = setTimeout(() => {
        beitaLeit();
        // Fyrsti stafur nýrrar leitar: sýndu niðurstöðurnar frá toppi ef notandinn var kominn neðar
        if (!var_.trim() && leit.trim()) { const g = v.querySelector('.rg-grind'), st = v.querySelector('.rg-stika'); if (g && st && g.getBoundingClientRect().top < st.getBoundingClientRect().bottom) skrunaUndirStiku(g); }
        merkjaVirkan();
      }, 120);
    });
    v.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && e.target.closest('[data-rg-leit]') && leit) { e.preventDefault(); e.stopPropagation(); e.target.value = ''; leit = ''; beitaLeit(); }
    });
    const ankeri = document.querySelector('.view');
    (ankeri && ankeri.parentNode ? ankeri.parentNode : document.body).appendChild(v);
    return v;
  }

  function opna() {
    injectCss(); ensureView(); teikna();
    if (_gogn || _villa) return;
    hlada().then(() => { _villa = null; teikna(); }, (err) => { _villa = (err && err.message) || 'óþekkt villa'; try { if (window.logProblem) window.logProblem('reglur_hledsla', _villa); } catch (_) {} teikna(); });
  }

  function navTakki() {
    if (document.querySelector('.view-nav [data-view="' + NAV_KEY + '"]')) return true;
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav || !nav.querySelector('.vnav-btn[data-view]')) return false;
    // Sama gerð og takkarnir í index.html (button.vnav-btn + svg + span). Táknið ber data-sb-svg svo 391 sýni
    // það í sínum reit; 244 á ekkert tákn fyrir „Reglur" og lætur það því vera.
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vnav-btn';
    b.dataset.view = NAV_KEY;
    b.setAttribute('title', 'Reglur og leiðbeiningar um brunavarnabúnað');
    b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" data-sb-svg="1" data-sb-key="Reglur" aria-hidden="true">' + IK.vog + '</svg><span>Reglur</span>';
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); });
    // Sækir efnið um leið og bendillinn nálgast — smellurinn sýnir þá tilbúna síðu
    const forsaekja = () => { hlada().catch(() => {}); };
    b.addEventListener('pointerenter', forsaekja, { once: true });
    b.addEventListener('focus', forsaekja, { once: true });
    nav.appendChild(b);   // aftast; 68 setur óþekkta takka neðst (order 9000+)
    return true;
  }
  function hookSwitch() {
    if (!window.App || !App.switchView) return false;
    if (App.__reglurPatched) return true;
    const orig = App.switchView.bind(App);
    App.switchView = function (k) {
      if (k === NAV_KEY) {
        document.querySelectorAll('.view').forEach((x) => { if (x.id !== VIEW_ID) { x.style.display = 'none'; x.classList.remove('active'); } });
        const el = ensureView();
        el.style.display = 'block'; el.classList.add('active');
        document.querySelectorAll('.vnav-btn').forEach((b) => { const a = b.dataset.view === NAV_KEY; if (b.classList.contains('active') !== a) b.classList.toggle('active', a); });
        try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
        opna();
        try { if (location.hash.replace('#', '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
        return;
      }
      const me = document.getElementById(VIEW_ID);
      if (me) { me.style.display = 'none'; me.classList.remove('active'); }
      const r = orig(k);
      try {
        if (typeof k === 'string' && location.hash.replace('#', '') === NAV_KEY) {
          const slug = (window.UrlRouting && UrlRouting.slugForView) ? UrlRouting.slugForView(k) : k;
          history.replaceState(null, '', '#' + slug);
        }
      } catch (_) {}
      return r;
    };
    App.__reglurPatched = true;
    return true;
  }

  let _tilraunir = 0;
  function start() {
    // Síðan verður til STRAX, falin, svo djúptengill (#reglur) og endurhleðsla finni hana (sbr. 447/419).
    if (document.querySelector('.view')) { injectCss(); ensureView(); }
    const ok = navTakki() & hookSwitch();
    if (!ok && ++_tilraunir < 40) { setTimeout(start, 300); return; }
    try {
      if (location.hash.replace('#', '') === NAV_KEY) {
        const el = document.getElementById(VIEW_ID);
        if (!el || !el.classList.contains('active')) App.switchView(NAV_KEY);
      }
    } catch (_) {}
    window.addEventListener('hashchange', () => { if (location.hash.replace('#', '') === NAV_KEY && window.App && App.switchView) App.switchView(NAV_KEY); });
    window.addEventListener('scroll', aSkruni, { capture: true, passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.Reglur = {
    opna: () => (window.App && App.switchView ? App.switchView(NAV_KEY) : opna()),
    hoppa,
    leita: (q) => { leit = String(q || ''); const i = document.querySelector('#' + VIEW_ID + ' [data-rg-leit]'); if (i) i.value = leit; beitaLeit(); },
    hlada,
    md: (t) => blokkir(String(t).replace(/\r\n?/g, '\n').split('\n'), { stigBil: 0, iLista: false }),
    version: '449',
  };
  console.log('[449] Reglur');
})();
/* === END REGLUR === */
