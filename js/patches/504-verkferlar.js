/* === VERKFERLAR — upplýsingaskjöl þjónustu (504) — 11.11.2026 ===
   Agnar (um verkferil neyðarlýsingar, og sendi strax á eftir verkferil brunaviðvörunarkerfa): „mátt kannski vista þetta inn á
   neyðarlýsingar í kannski upplýsingaskjal og getum notast eitthvað við þetta við samningaformið."

   HVAÐ:  lítið skjalasafn — eitt skjal per þjónustu: hvað er gert við skoðun, eftir hvaða reglum, hvað það kostar og hvað er
          ekki innifalið. Skoða, breyta, prenta, afrita. Samningsform sækja textann héðan.
   HVAR:  • „📄 Verkferill" í haus hvers verðlista (502) — opnar skjal þess lista (Neyðarljós → neyðarlýsing).
          • „Verkferlar" á Tilboð & samningar (201) — allt safnið.
          • „Sækja verkferil" í forminu Þjónustusamningur (201) — setur verkþættina inn í samninginn.
   GÖGN:  app_settings.verkferlar[<id>] = { id, nafn, titill, texti, rod, u, eytt }. Skjölin tvö frá Agnari eru STOFN í kóðanum og
          fara á þjóninn við fyrstu breytingu — ekkert skrifað við hleðslu. Vistað skjal á þjóni ræður yfir stofninum.
   TEXTI: orðréttur frá Agnari. Verð í textanum eru hans (14.500 kr. + vsk. á klst.) — hér er engu verði bætt við.
   API:   window.Verkferlar = { opna(id?), listi(), get(id), html(skjal), prenta(id) }  ·  event `verkferlar-breytt` á document.
*/
(() => {
  if (window.Verkferlar) return;

  const P = 'vf4', KEY = 'verkferlar';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = t => { try { if (window.Toast && Toast.show) { Toast.show(t); return; } } catch (_) {} };

  const STOFN = [
    { id: 'neydarljos', rod: 10, nafn: 'Neyðar- og útgöngulýsing',
      titill: 'Verkferill – Árleg skoðun neyðar- og útgöngulýsingar',
      texti: [
        'Við árlega skoðun neyðar- og útgöngulýsingar eru eftirfarandi verkþættir framkvæmdir:',
        '',
        '1. Sjónskoðun: Ástand, festingar, staðsetning og sýnileiki neyðar- og útgöngulampa yfirfarin.',
        '2. Flóttaleiðir og merkingar: Yfirfarið hvort útgöngumerkingar séu greinilegar og hvort neyðarlýsing sé til staðar á nauðsynlegum stöðum.',
        '3. Skráning frávika: Skráðar eru sýnilegar bilanir, skemmdir og önnur frávik ásamt tillögum að úrbótum.',
        '4. Skýrslugerð: Skilað er skoðunarskýrslu með niðurstöðum og yfirliti yfir búnað sem þarfnast viðgerðar eða endurnýjunar.',
        '',
        'Skoðunin er framkvæmd með hliðsjón af byggingarreglugerð nr. 112/2012 og staðlinum ÍST EN 50172, eftir því sem við á.',
        'Verð: Tímavinna er 14.500 kr. + vsk. (17.980 kr. með vsk.) á klukkustund. Lágmarksgjald miðast við 2 klukkustundir, samtals 29.000 kr. + vsk. (35.960 kr. með vsk.). Almennt tekur skoðunin ekki lengri tíma en 2 klukkustundir, nema um stærri byggingar eða umfangsmeiri skoðanir sé að ræða.',
        'Athugið: Skoðunin er sjónræn ástandsyfirferð. Viðgerðir, varahlutir, rafhlöðuskipti og ljósstyrksmælingar eru ekki innifalin nema sérstaklega sé um það samið.'
      ].join('\n') },
    { id: 'brunakerfi', rod: 20, nafn: 'Brunaviðvörunarkerfi',
      titill: 'Verkferill – Árleg skoðun og þjónusta brunaviðvörunarkerfa',
      texti: [
        'Við árlega skoðun og þjónustu brunaviðvörunarkerfa eru eftirfarandi verkþættir framkvæmdir:',
        '',
        '1. Sjónskoðun: Ástand stjórnstöðvar, reykskynjara, hitaskynjara, handboða, hljóðgjafa og annars búnaðar kerfisins er yfirfarið.',
        '2. Virkniprófun: Virkni skynjara, handboða og viðvörunarbúnaðar er prófuð samkvæmt viðeigandi prófunarferlum og leiðbeiningum framleiðanda.',
        '3. Stjórnstöð: Yfirfarnar eru bilanatilkynningar, atvikaskráningar, stöðuvísar og almenn virkni stjórnstöðvar.',
        '4. Rafhlöður og varaafl: Ástand rafhlaðna, hleðslubúnaðar og varaafls er yfirfarið og virkni prófuð eftir því sem við á.',
        '5. Tengd kerfi: Yfirfarnar og prófaðar eru tengingar við tengdan brunavarnabúnað, svo sem hurðarsegla, loftræsikerfi og boðflutningsbúnað, eftir því sem við á.',
        '6. Skráning frávika: Allar bilanir, skemmdir og önnur frávik sem koma í ljós við skoðun eru skráð.',
        '7. Úrbætur og viðgerðir: Lögð er áhersla á að lagfæra bilanir og skipta um bilaðan búnað samhliða skoðun, eftir því sem aðstæður og aðgengi að varahlutum leyfa. Markmiðið er að skila kerfinu í fullnægjandi ástandi að skoðun lokinni.',
        '8. Skýrslugerð: Að lokinni skoðun er skilað þjónustu- og skoðunarskýrslu með niðurstöðum prófana, upplýsingum um framkvæmdar úrbætur og yfirliti yfir möguleg óleyst frávik. Þegar öll frávik hafa verið lagfærð er staðfest að kerfið hafi staðist framkvæmdar prófanir.',
        '',
        'Skoðun og þjónusta fer fram með hliðsjón af byggingarreglugerð nr. 112/2012, viðeigandi stöðlum, meðal annars ÍST EN 54 staðlaröðinni, og þjónustuleiðbeiningum framleiðanda.',
        'Verð utan tilboðs: Tímavinna er 14.500 kr. + vsk. (17.980 kr. með vsk.) á klukkustund.',
        'Athugið: Viðgerðir, varahlutir, rafhlöðuskipti og breytingar á kerfinu eru ekki innifalin í verði skoðunar og eru gjaldfærð sérstaklega. Umfang skoðunar og prófana tekur mið af gerð kerfisins, viðeigandi kröfum og þjónustufyrirmælum.'
      ].join('\n') }
  ];

  // ───────────────────────────── gögn ─────────────────────────────
  const norm = (d, id) => ({ id: String(d.id || id), nafn: String(d.nafn || ''), titill: String(d.titill || ''), texti: String(d.texti || ''), rod: Number(d.rod) || 999, u: d.u || '', eytt: !!d.eytt });
  function aThjoni() { const o = (window.AppSettings && AppSettings.path && AppSettings.path(KEY)) || {}; return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; }
  // Stofn + þjónn; þjónninn ræður þar sem skjalið er til þar (líka `eytt`).
  function oll(medEyddum) {
    const th = aThjoni(), m = {};
    STOFN.forEach(d => { m[d.id] = norm(d, d.id); });
    Object.keys(th).forEach(id => { if (th[id] && typeof th[id] === 'object') m[id] = norm(Object.assign({}, m[id] || {}, th[id]), id); });
    return Object.keys(m).map(k => m[k]).filter(d => medEyddum || !d.eytt).sort((a, b) => (a.rod - b.rod) || a.nafn.localeCompare(b.nafn, 'is'));
  }
  const get = id => oll(false).filter(d => d.id === id)[0] || null;
  async function vistaSkjal(d) {
    if (!window.AppSettings || !AppSettings.save) return false;
    const ok = await AppSettings.save({ [KEY]: { [d.id]: d } });
    if (ok !== false) { try { document.dispatchEvent(new CustomEvent('verkferlar-breytt', { detail: { id: d.id } })); } catch (_) {} }
    return ok !== false;
  }

  // ───────────────────────────── texti → HTML (prentun) ─────────────────────────────
  // Tölusettar línur verða listi; „Heiti: …" fremst í línu er feitletrað. Annað er óbreyttur texti — engu er bætt við.
  function textiHtml(t) {
    const feit = s => { const m = /^([^:]{2,34}):\s+([\s\S]+)$/.exec(s); return m ? '<b>' + esc(m[1]) + ':</b> ' + esc(m[2]) : esc(s); };
    const ut = []; let li = [];
    const loka = () => { if (li.length) { ut.push('<ol style="margin:0 0 10px;padding-left:22px">' + li.map(x => '<li style="margin-bottom:5px">' + x + '</li>').join('') + '</ol>'); li = []; } };
    String(t || '').split(/\r?\n/).forEach(l => {
      const s = l.trim(); if (!s) { loka(); return; }
      const m = /^\d+[.)]\s+([\s\S]+)$/.exec(s);
      if (m) li.push(feit(m[1])); else { loka(); ut.push('<p style="margin:0 0 9px">' + feit(s) + '</p>'); }
    });
    loka();
    return '<div style="font-size:12.5px;line-height:1.6;color:#0f172a">' + ut.join('') + '</div>';
  }
  function html(d) {
    const h = window.TilbodHub && TilbodHub.vf;
    const inner = '<div style="font-size:19px;font-weight:800;margin:2px 0 14px;color:#0f172a">' + esc(d.titill || d.nafn || 'Verkferill') + '</div>' + textiHtml(d.texti);
    if (h) return h.docShell('Verkferill', '', '', inner, h.skjalNafn([d.titill || d.nafn || 'Verkferill']), '');
    return '<!DOCTYPE html><html lang="is"><head><meta charset="utf-8"><title>' + esc(d.titill || 'Verkferill') + '</title></head><body style="font-family:Arial,sans-serif;max-width:760px;margin:24px auto;padding:0 16px">' + inner + '</body></html>';
  }
  function prentaSkjal(d) {
    const h = window.TilbodHub && TilbodHub.vf;
    if (h) { h.printDoc(html(d)); return; }
    const w = window.open('', '_blank'); if (!w) { toast('Vafrinn lokaði á prentgluggann'); return; }
    w.document.write(html(d)); w.document.close();
  }

  // ───────────────────────────── gluggi ─────────────────────────────
  function stilar() {
    if (document.getElementById(P + '-stil')) return;
    const B = '#' + P + '-bak ';
    const hn = 'all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit';
    const css = [
      '#' + P + '-bak{position:fixed;inset:0;z-index:12500;background:rgba(8,10,14,.62);display:flex;align-items:flex-start;justify-content:center;padding:26px 12px;overflow:auto;font-family:"IBM Plex Sans",system-ui,-apple-system,sans-serif}',
      B + '.' + P + '-g{background:#fff;border-radius:12px;max-width:1040px;width:100%;margin:auto;box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden;color:#0f172a}',
      B + '.' + P + '-h{display:flex;align-items:center;gap:12px;padding:14px 20px;background:linear-gradient(145deg,#15171c,#30333b);color:#fff;border-bottom:3px solid #d3ab4e}',
      B + '.' + P + '-h h2{margin:0;font-size:17px;font-weight:800;color:#fff;-webkit-text-fill-color:#fff;flex:1;min-width:0}',
      B + '.' + P + '-h p{margin:2px 0 0;font-size:12px;color:#c9d0da;-webkit-text-fill-color:#c9d0da;font-weight:400}',
      B + '.' + P + '-x{' + hn + ';width:34px;padding:0;background:rgba(255,255,255,.16);color:#fff;font-size:18px}',
      B + '.' + P + '-m{display:grid;grid-template-columns:220px minmax(0,1fr);min-height:420px}',
      B + '.' + P + '-l{background:#f1f5f9;border-right:1px solid #e2e8f0;padding:12px 10px;display:flex;flex-direction:column;gap:6px}',
      B + '.' + P + '-l button{all:unset;box-sizing:border-box;display:block;width:100%;padding:9px 11px;border-radius:7px;font-size:13px;font-weight:600;color:#334155;cursor:pointer;line-height:1.3;font-family:inherit}',
      B + '.' + P + '-l button:hover{background:#e2e8f0}',
      B + '.' + P + '-l button.on{background:#1f2530;color:#fff}',
      B + '.' + P + '-l button.ny{margin-top:6px;border:1px dashed #94a3b8;color:#475569;text-align:center;font-weight:700}',
      B + '.' + P + '-e{padding:16px 20px;min-width:0}',
      B + '.' + P + '-r{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:10px;margin-bottom:10px}',
      B + 'label{display:block;font-size:11px;font-weight:700;color:#64748b;min-width:0;margin:0}',
      B + 'label input,' + B + 'label textarea{display:block;width:100%;margin:3px 0 0;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;font-weight:400;color:#0f172a;background:#fff;box-sizing:border-box;min-height:0;height:auto}',
      B + 'label textarea{min-height:340px;line-height:1.55;resize:vertical}',
      B + '.' + P + '-st{font-size:11.5px;color:#64748b;margin:8px 0 0;min-height:16px}',
      B + '.' + P + '-f{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:12px 20px;border-top:1px solid #e2e8f0;background:#fff}',
      B + '.' + P + '-f .sp{margin-left:auto}',
      B + '.' + P + '-t{' + hn + ';border:1px solid #cbd5e1;background:#fff;color:#0f172a}',
      B + '.' + P + '-t.v{border:0;background:linear-gradient(180deg,#b91c1c,#7f1d1d);color:#fff;padding:0 20px}',
      B + '.' + P + '-t.e{color:#b42318;border-color:#fecaca}',
      B + '.' + P + '-t:disabled{opacity:.45;cursor:default}',
      '@media (max-width:760px){',
      '#' + P + '-bak{padding:10px 8px}',
      B + '.' + P + '-m{grid-template-columns:minmax(0,1fr);min-height:0}',
      B + '.' + P + '-l{flex-direction:row;flex-wrap:wrap;border-right:0;border-bottom:1px solid #e2e8f0}',
      B + '.' + P + '-l button{width:auto;padding:8px 11px}',
      B + '.' + P + '-l button.ny{margin-top:0}',
      B + '.' + P + '-r{grid-template-columns:minmax(0,1fr)}',
      B + 'label textarea{min-height:260px}',
      B + '.' + P + '-f .sp{margin-left:0}',
      B + '.' + P + '-t{flex:1 1 auto;height:42px}',
      '}'
    ].join('\n');
    const st = document.createElement('style'); st.id = P + '-stil'; st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  let _virkt = null;      // skjalið í ritlinum (afrit)
  let _nytt = false;      // true = ekki til enn (hvorki stofn né þjónn)
  let _breytt = false;
  const bak = () => document.getElementById(P + '-bak');
  const el = k => { const b = bak(); return b ? b.querySelector('[data-k="' + k + '"]') : null; };

  function loka(spyrja) {
    const b = bak(); if (!b) return true;
    if (spyrja && _breytt && !confirm('Loka án þess að vista breytingarnar á skjalinu?')) return false;
    b.remove(); document.removeEventListener('keydown', escLoka, true); _breytt = false;
    return true;
  }
  function escLoka(e) {
    if (e.key !== 'Escape' || !bak()) return;
    if (document.getElementById('_th-print-modal') || document.getElementById('_th-modal')) return;
    e.stopPropagation(); loka(true);
  }

  // Nýtt skjal fyrir lista/þjónustu sem á ekkert enn — ekkert vistað fyrr en ýtt er á Vista.
  function tomt(id, nafn) {
    return { id: id || ('v' + Date.now()), nafn: nafn || '', titill: nafn ? 'Verkferill – ' + nafn : '', texti: '', rod: 500, u: '', eytt: false };
  }

  function velja(id, o) {
    const d = id ? get(id) : null;
    _nytt = !d;
    _virkt = d ? Object.assign({}, d) : tomt(id, o && o.nafn);
    _breytt = false;
    teikna();
  }

  function teikna() {
    const b = bak(); if (!b || !_virkt) return;
    const skjol = oll(false);
    b.querySelector('.' + P + '-l').innerHTML =
      skjol.map(d => '<button type="button" data-skjal="' + esc(d.id) + '" class="' + (d.id === _virkt.id ? 'on' : '') + '">' + esc(d.nafn || d.titill || d.id) + '</button>').join('') +
      (_nytt ? '<button type="button" class="on" data-skjal="' + esc(_virkt.id) + '">' + esc(_virkt.nafn || 'Nýtt skjal') + ' <span style="font-weight:400;opacity:.75">· óvistað</span></button>' : '') +
      '<button type="button" class="ny" data-a="nytt">＋ Nýtt skjal</button>';
    b.querySelector('.' + P + '-e').innerHTML =
      '<div class="' + P + '-r">' +
        '<label>Heiti (stutt — í lista og vali)<input data-k="nafn" type="text" value="' + esc(_virkt.nafn) + '" placeholder="T.d. Neyðar- og útgöngulýsing"></label>' +
        '<label>Fyrirsögn skjalsins<input data-k="titill" type="text" value="' + esc(_virkt.titill) + '" placeholder="Verkferill – …"></label>' +
      '</div>' +
      '<label>Texti — verkþættir, reglur, verð og fyrirvarar<textarea data-k="texti" placeholder="1. Sjónskoðun: …&#10;2. …&#10;&#10;Verð: …&#10;Athugið: …">' + esc(_virkt.texti) + '</textarea></label>' +
      '<div class="' + P + '-st" data-k="stada"></div>';
    stada();
  }
  function stada(t) {
    const s = el('stada'); if (!s) return;
    const sto = STOFN.some(d => d.id === _virkt.id) && !aThjoni()[_virkt.id];
    s.textContent = t || (_breytt ? 'Óvistaðar breytingar.' : _nytt ? 'Nýtt skjal — vistast þegar þú ýtir á Vista.' : sto ? 'Texti frá Agnari 11.11.2026. Vistast á þjóninn við fyrstu breytingu.' : (_virkt.u ? 'Síðast vistað ' + String(_virkt.u).slice(0, 10).split('-').reverse().join('.') + '.' : ''));
    const e = bak().querySelector('[data-a="eyda"]'); if (e) e.disabled = _nytt;
  }
  function lesa() {
    return Object.assign({}, _virkt, { nafn: (el('nafn').value || '').trim(), titill: (el('titill').value || '').trim(), texti: (el('texti').value || '').replace(/\s+$/, '') });
  }

  let _vistar = false;
  async function vista() {
    if (_vistar) return; _vistar = true;
    try {
      const d = lesa();
      if (!d.nafn) d.nafn = d.titill.replace(/^Verkferill\s*[–-]\s*/i, '') || 'Ónefnt skjal';   // vistun er aldrei stöðvuð
      d.u = new Date().toISOString(); d.eytt = false;
      const ok = await vistaSkjal(d);
      if (!ok) { stada('Vistun tókst ekki — reyndu aftur.'); return; }
      _virkt = d; _nytt = false; _breytt = false; teikna(); stada('✓ Vistað.'); toast('✓ Verkferill vistaður');
    } finally { _vistar = false; }
  }
  async function eyda() {
    if (_nytt) return;
    if (!confirm('Eyða skjalinu „' + (_virkt.nafn || _virkt.titill) + '"?')) return;
    const ok = await vistaSkjal(Object.assign({}, _virkt, { eytt: true, u: new Date().toISOString() }));   // mjúk eyðing — röðin stendur
    if (!ok) { stada('Eyðing tókst ekki — reyndu aftur.'); return; }
    toast('Skjali eytt'); const n = oll(false)[0];
    if (n) velja(n.id); else { _virkt = tomt(); _nytt = true; _breytt = false; teikna(); }
  }
  async function afrita() {
    const d = lesa(), t = (d.titill ? d.titill + '\n' : '') + d.texti;
    try { await navigator.clipboard.writeText(t); toast('✓ Textinn afritaður'); stada('✓ Afritað á klippiborð.'); }
    catch (_) { const a = el('texti'); if (a) { a.focus(); a.select(); } stada('Textinn er valinn — afritaðu með Ctrl+C.'); }
  }

  async function opna(id, o) {
    stilar();
    try { if (window.AppSettings && AppSettings.load) await AppSettings.load(); } catch (_) {}
    loka(false);
    const b = document.createElement('div'); b.id = P + '-bak';
    b.innerHTML = '<div class="' + P + '-g" role="dialog" aria-modal="true" aria-label="Verkferlar og upplýsingar">' +
      '<div class="' + P + '-h"><div style="flex:1;min-width:0"><h2>📄 Verkferlar og upplýsingar</h2><p>Hvað er gert við skoðun, eftir hvaða reglum og hvað það kostar — notað í samninga og tilboð.</p></div>' +
        '<button type="button" class="' + P + '-x" data-a="loka" aria-label="Loka">×</button></div>' +
      '<div class="' + P + '-m"><div class="' + P + '-l"></div><div class="' + P + '-e"></div></div>' +
      '<div class="' + P + '-f">' +
        '<button type="button" class="' + P + '-t e" data-a="eyda" title="Eyða þessu skjali">Eyða</button>' +
        '<span class="sp"></span>' +
        '<button type="button" class="' + P + '-t" data-a="afrita" title="Afrita fyrirsögn og texta á klippiborð">Afrita texta</button>' +
        '<button type="button" class="' + P + '-t" data-a="prenta" title="Prenta skjalið á A4 með haus félagsins">🖨 Prenta</button>' +
        '<button type="button" class="' + P + '-t v" data-a="vista">💾 Vista</button>' +
      '</div></div>';
    document.body.appendChild(b);
    b.addEventListener('input', () => { if (!_breytt) { _breytt = true; stada(); } });
    b.addEventListener('click', e => {
      if (e.target === b) { loka(true); return; }
      const s = e.target.closest('[data-skjal]');
      if (s) { if (s.dataset.skjal === _virkt.id) return; if (_breytt && !confirm('Skipta um skjal án þess að vista breytingarnar?')) return; velja(s.dataset.skjal); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      switch (a.dataset.a) {
        case 'loka': loka(true); break;
        case 'nytt': if (_breytt && !confirm('Byrja á nýju skjali án þess að vista breytingarnar?')) return; _virkt = tomt(); _nytt = true; _breytt = false; teikna(); { const n = el('nafn'); if (n) n.focus(); } break;
        case 'vista': vista(); break;
        case 'eyda': eyda(); break;
        case 'afrita': afrita(); break;
        case 'prenta': prentaSkjal(lesa()); break;
      }
    });
    document.addEventListener('keydown', escLoka, true);
    const skjol = oll(false);
    if (id) velja(id, o); else if (skjol.length) velja(skjol[0].id); else { _virkt = tomt(); _nytt = true; teikna(); }
  }

  // ───────────────────────────── tengingar ─────────────────────────────
  // Þjónustugluggarnir í 410 (Slökkvitæki · Brunakerfi · Slökkvikerfi) fá sama takka; skjalið ber auðkenni flokksins.
  const FLOKKAR_410 = { slokkvitaeki: 'Slökkvitæki', brunakerfi: 'Brunaviðvörunarkerfi', slokkvikerfi: 'Slökkvikerfi í eldhúsi' };
  let _tengt410 = false, _tilr410 = 0;
  function tengjaThjonustuglugga() {
    if (_tengt410) return;
    const H = window.ThjonustuTengingar;
    if (!H || !H.hausTakki) { if (_tilr410++ < 40) setTimeout(tengjaThjonustuglugga, 300); return; }
    _tengt410 = true;
    H.hausTakki({ texti: '📄 Verkferill', titill: 'Verkferill og upplýsingar um þessa þjónustu — skoða, breyta, prenta', smellur: fl => opna(fl, { nafn: FLOKKAR_410[fl] || fl }) });
  }

  let _tengt = false, _tilr = 0;
  function tengja() {
    if (_tengt) return;
    const V = window.Verdlistar, T = window.TilbodHub;
    if (!V || !V.hausTakki || !T || !T.tol) { if (_tilr++ < 40) setTimeout(tengja, 300); return; }
    _tengt = true;
    // '*' = allir verðlistar. Listinn á sitt skjal undir sama auðkenni (neydarljos → neyðarlýsing); eigi hann ekkert opnast autt skjal með nafni listans.
    V.hausTakki('*', { texti: '📄 Verkferill', titill: 'Verkferill og upplýsingar um þessa þjónustu — skoða, breyta, prenta',
      smellur: id => { const l = (V.listi() || []).filter(x => x.id === id)[0]; opna(id, { nafn: l ? l.nafn : '' }); } });
    tengjaThjonustuglugga();
    T.tol({ texti: 'Verkferlar', titill: 'Verkferlar og upplýsingar um þjónustur — notað í samninga og tilboð', smellur: () => opna() });
  }
  tengja();

  window.Verkferlar = {
    opna: opna,
    listi: () => oll(false).map(d => ({ id: d.id, nafn: d.nafn, titill: d.titill })),
    get: id => { const d = get(id); return d ? Object.assign({}, d) : null; },
    html: html,
    textiHtml: textiHtml,
    prenta: id => { const d = get(id); if (d) prentaSkjal(d); }
  };
})();
