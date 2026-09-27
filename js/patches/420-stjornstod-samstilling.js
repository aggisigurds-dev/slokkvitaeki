/* === STJÓRNSTÖÐ — SAMSTILLING GAGNA (420) — 28.09.2026 ===
 *
 * Agnar: „need to review the old stjórnborð to connect to all sync and pull buttons" — gamla Stjórnborðið
 * heitir nú Stjórnstöð (61, #stjornstod). Hún sýndi tölur en hafði engan takka til að SÆKJA gögnin á bak við þær;
 * þeir voru dreifðir um Kröfu yfirlit, Kostnaður og Bakenda brunaholf. Hér eru þeir allir á einum stað:
 * hver lína segir hvenær gögnin voru síðast sótt og hefur „Sækja" takka.
 *
 *   Slökkvitæki   Kostnaður (viðhengi úr pósti) · Payday reikningar · Payday greiðslustaða · póstur eldklar@ og bokhald@
 *   Brunahólf     Tímavera · Payday · Redder · Ajour · Landsbankinn (ferskleiki úr brunaholf /api/data-sources-status;
 *                 Redder/Ajour/Landsbanki eru keyrð í hubbinum — þar eru fleiri skref, svo hér er hlekkur þangað)
 *
 * Staðan (hvenær síðast) er ALLTAF lesin af þjóninum — aldrei úr vafranum — svo allar vélarnar sjái það sama.
 * Hlutinn er settur inn með upprunalega MutationObserver í sama verki og 61 teiknar (engin rammi án hans, ekkert
 * hopp) og sami hnútur er endurnýttur, svo framvinda í gangi lifir endurteikningu 61 af.
 */
(() => {
  if (window.__samstilling420) return;
  window.__samstilling420 = true;

  const HUB = 'https://brunaholf.netlify.app';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,sans-serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const RIVET = 'content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sb = () => (window.DB && DB.sb) || null;
  async function getJSON(url, opt) {
    const r = await fetch(url, opt);
    const j = await r.json().catch(() => ({}));
    if (!r.ok && r.status !== 202) throw new Error(j.error || ('HTTP ' + r.status));
    return j;
  }
  const bida = (ms) => new Promise((r) => setTimeout(r, ms));
  // „í dag 14:05" / „í gær 09:12" / „3 dagar síðan" — dagsetningar DD/MM/YYYY þegar lengra er liðið.
  function hvenaer(iso) {
    if (!iso) return null;
    const d = new Date(iso); if (isNaN(d)) return null;
    const nu = new Date(), k = (x) => String(x).padStart(2, '0');
    const klst = k(d.getHours()) + ':' + k(d.getMinutes());
    const dagar = Math.floor((new Date(nu.getFullYear(), nu.getMonth(), nu.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    if (dagar <= 0) return 'í dag ' + klst;
    if (dagar === 1) return 'í gær ' + klst;
    if (dagar < 8) return dagar + ' dagar síðan';
    return k(d.getDate()) + '/' + k(d.getMonth() + 1) + '/' + d.getFullYear();
  }
  const aldurDaga = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 864e5 : Infinity);

  // Hámarksaldur (dagar) áður en lína verður gul/rauð.
  async function sidastUr(tafla, dalkur, sia) {
    const c = sb(); if (!c) return null;
    let q = c.from(tafla).select(dalkur).order(dalkur, { ascending: false }).limit(1);
    if (sia) q = sia(q);
    const { data } = await q;
    return data && data[0] ? data[0][dalkur] : null;
  }
  // automation_runs og google_oauth eru lokaðar anon-lyklinum — brunaholf /api/stjornstod-stada les þær og skilar
  // aðeins tíma síðustu keyrslu og hvaða pósthólf eru tengd (engin tokens).
  let _ss = null, _ssAt = 0;
  async function stjornstodStada() {
    if (_ss && Date.now() - _ssAt < 60000) return _ss;
    try { _ss = await getJSON(HUB + '/api/stjornstod-stada'); _ssAt = Date.now(); } catch (_) { _ss = _ss || { keyrslur: {}, postholf: [] }; }
    return _ss;
  }
  let _dss = null, _dssAt = 0;
  async function dss() {
    if (_dss && Date.now() - _dssAt < 60000) return _dss;
    try { _dss = await getJSON(HUB + '/api/data-sources-status'); _dssAt = Date.now(); } catch (_) { _dss = _dss || { sources: [] }; }
    return _dss;
  }
  const dssLina = (key) => async () => {
    const s = ((await dss()).sources || []).find((x) => x.key === key);
    return s ? { tima: s.last_import, aukalega: s.count != null ? Number(s.count).toLocaleString('is-IS').replace(/,/g, '.') + ' færslur' : '' } : null;
  };

  const RADIR = [
    { hopur: 'Slökkvitæki', id: 'kostnadur', heiti: 'Kostnaður — viðhengi úr pósti', undir: 'eldklar@eldklar.is · reikningar lesnir og flokkaðir', gult: 3, rautt: 10,
      stada: async () => { const j = await getJSON(HUB + '/api/kostnadur?stada=1'); const s = j.stada || {}; return { tima: s.lokid || s.byrjad, aFerd: !!s.a_ferd, aukalega: s.lokid ? (s.nyjar || 0) + ' ný síðast' : '' }; },
      keyra: async (setja) => {
        const r = await fetch(HUB + '/api/kostnadur', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'sync', days: 31 }) });
        if (r.status !== 202 && r.status !== 409) { const j = await r.json().catch(() => ({})); throw new Error(j.error || ('HTTP ' + r.status)); }
        for (let i = 0; i < 120; i++) {           // bakgrunnsfall — staðan lesin á 8 sek fresti, mest í 16 mín
          await bida(8000);
          const s = (await getJSON(HUB + '/api/kostnadur?stada=1')).stada || {};
          if (!s.a_ferd) return (s.nyjar || 0) + ' ný skjöl' + (s.villur && s.villur.length ? ' · ' + s.villur.length + ' athugasemdir' : '');
          setja('les… ' + (s.nyjar || 0) + ' ný');
        }
        return 'enn í gangi';
      } },
    { hopur: 'Slökkvitæki', id: 'payday-slokk', heiti: 'Payday — reikningar', undir: 'reikningar Slökkvitækis úr Payday', gult: 2, rautt: 7,
      stada: async () => ({ tima: await sidastUr('payday_invoices_slokk', 'updated_at') }),
      keyra: async () => { const j = await getJSON('/api/payday-pull-slokk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); return (j.upserted != null ? j.upserted : j.fetched || 0) + ' reikningar'; } },
    { hopur: 'Slökkvitæki', id: 'payday-greitt', heiti: 'Payday — greiðslustaða', undir: 'merkir greiddar kröfur', gult: 2, rautt: 7,
      stada: async () => { const k = ((await stjornstodStada()).keyrslur || {})['payday-sync-cron']; return { tima: k && k.sidast }; },
      keyra: async () => { const j = await getJSON('/api/payday-sync-paid', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); return (j.marked_count || 0) + ' merktar greiddar af ' + (j.candidates || 0); } },
    { hopur: 'Slökkvitæki', id: 'postur-eldklar', heiti: 'Póstur — eldklar@', undir: 'innhólf eldklar@eldklar.is', gult: 1, rautt: 3,
      stada: async () => ({ tima: await sidastUr('email_digest', 'fetched_at', (q) => q.eq('account', 'eldklar@eldklar.is')) }),
      keyra: async () => { const j = await getJSON(HUB + '/api/gmail-ingest?account=' + encodeURIComponent('eldklar@eldklar.is') + '&days=3'); return (j.upserted != null ? j.upserted : (j.count || 0)) + ' póstar'; } },
    { hopur: 'Slökkvitæki', id: 'postur-bokhald', heiti: 'Póstur — bokhald@', undir: 'innhólf bokhald@eldklar.is', gult: 2, rautt: 7,
      stada: async () => ({ tima: await sidastUr('email_digest', 'fetched_at', (q) => q.eq('account', 'bokhald@eldklar.is')) }),
      keyra: async () => { const j = await getJSON(HUB + '/api/gmail-ingest?account=' + encodeURIComponent('bokhald@eldklar.is') + '&days=3'); return (j.upserted != null ? j.upserted : (j.count || 0)) + ' póstar'; } },
    { hopur: 'Brunahólf', id: 'timavera', heiti: 'Tímavera', undir: 'tímaskráningar', gult: 1, rautt: 3, stada: dssLina('timavera'),
      keyra: async () => { const j = await getJSON(HUB + '/api/timavera-pull?days=30'); _dss = null; return (j.upserted != null ? j.upserted : 0) + ' færslur'; } },
    { hopur: 'Brunahólf', id: 'payday-bh', heiti: 'Payday — Brunahólf', undir: 'reikningar og kröfur', gult: 2, rautt: 7, stada: dssLina('invoices'),
      keyra: async () => { const j = await getJSON(HUB + '/api/payday-pull'); _dss = null; return (j.upserted != null ? j.upserted : 0) + ' reikningar'; } },
    { hopur: 'Brunahólf', id: 'redder', heiti: 'Redder', undir: 'efnisreikningar · keyrt í hubbinum', gult: 3, rautt: 10, stada: dssLina('redder'), hlekkur: HUB },
    { hopur: 'Brunahólf', id: 'ajour', heiti: 'Ajour', undir: 'skráningar · keyrt í hubbinum', gult: 3, rautt: 10, stada: dssLina('ajour'), hlekkur: HUB },
    { hopur: 'Brunahólf', id: 'banki', heiti: 'Landsbankinn', undir: 'bankayfirlit · keyrt í hubbinum', gult: 14, rautt: 45, stada: dssLina('bank'), hlekkur: HUB },
  ];

  /* ── DAGURINN — morgunyfirlit (28.09.2026, Agnar: „number in vinnsla, the amount, number behind schedule in
   * Ársskoðun, if Gmail is connected, number of emails today … everything I need on one page to start the day
   * and plan"). Ársskoðunartölurnar koma úr Arsskodun.talningar() — SÖMU síu og flögurnar í Ársskoðun. ── */
  const D = { lesid: false, ars: null, arsVilla: '', postur: {}, postholf: [], bord: {}, kostn: null, dagskra: [], nota: '' };
  const kr = (n) => Math.round(+n || 0).toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  const mkr = (n) => (Math.abs(+n || 0) >= 1e6 ? (Math.round((+n || 0) / 1e5) / 10).toLocaleString('is-IS') + ' m.kr' : kr(n));
  const idag = () => { const d = new Date(), k = (x) => String(x).padStart(2, '0'); return d.getFullYear() + '-' + k(d.getMonth() + 1) + '-' + k(d.getDate()); };
  async function lesaDaginn() {
    const c = sb();
    const upphaf = new Date(); upphaf.setHours(0, 0, 0, 0);
    const verk = [];
    // Ársskoðun — hlaðið ef flipinn hefur ekki verið opnaður í lotunni.
    verk.push((async () => {
      try {
        if (!window.Arsskodun || !Arsskodun.talningar) throw new Error('Ársskoðun ekki hlaðin');
        let t = Arsskodun.talningar();
        if (!t && Arsskodun.loadAll) { await Arsskodun.loadAll(); t = Arsskodun.talningar(); }
        D.ars = t; D.arsVilla = t ? '' : 'Ársskoðun hlóðst ekki';
      } catch (e) { D.arsVilla = String(e.message || e); }
    })());
    if (c) {
      for (const netfang of ['eldklar@eldklar.is', 'bokhald@eldklar.is']) {
        verk.push(c.from('email_digest').select('id', { count: 'exact', head: true }).eq('account', netfang).gte('received_at', upphaf.toISOString()).or('folder.is.null,folder.neq.SENT')
          .then(({ count }) => { D.postur[netfang] = count == null ? null : count; }));
      }
      for (const st of ['nytt', 'i_vinnslu', 'tilbuid']) {
        verk.push(c.from('thjonustubeidni').select('id', { count: 'exact', head: true }).eq('status', st).is('deleted_at', null).is('archived_at', null)
          .then(({ count }) => { D.bord[st] = count; }));
      }
      verk.push(c.from('kostnadur').select('upphaed,flokkur,tegund').eq('stada', 'nytt').range(0, 999).then(({ data }) => {
        const l = (data || []).filter((r) => r.flokkur !== 'ekki_kostnadur' && r.tegund !== 'teya_yfirlit' && r.tegund !== 'kortayfirlit');
        D.kostn = { n: l.length, upphaed: l.reduce((s2, r) => s2 + (+r.upphaed || 0), 0) };
      }));
    }
    verk.push(stjornstodStada().then((ss) => { D.postholf = ss.postholf || []; }));
    // Dagskrá dagsins — ein dagskrá fyrir alla (368): verk allra starfsmanna + sameiginleg dagnóta.
    try {
      const allir = (window.AppSettings && AppSettings.path && AppSettings.path('vikudagskra.by_staff')) || {};
      const key = idag(), jobs = [];
      Object.keys(allir).forEach((n) => ((allir[n] && allir[n].jobs) || []).forEach((j) => { if (j && String(j.date || '').slice(0, 10) === key) jobs.push(Object.assign({ _n: n }, j)); }));
      jobs.sort((a, b) => (a.allday ? 0 : 1) - (b.allday ? 0 : 1) || String(a.time || '').localeCompare(String(b.time || '')));
      D.dagskra = jobs;
      D.nota = String((AppSettings.path('skipulagsbord.by_staff.Allir.dagnotur.' + key)) || '');
    } catch (_) {}
    await Promise.all(verk.map((p) => Promise.resolve(p).catch(() => {})));
    D.lesid = true;
    teiknaDag();
  }
  function flis(o) {
    return '<button type="button" class="dag-flis' + (o.tonn ? ' ' + o.tonn : '') + '" data-fara="' + esc(o.fara) + '">' +
      '<span class="dag-merki">' + esc(o.merki) + '</span>' +
      '<span class="dag-tala">' + (o.tala == null ? '—' : esc(o.tala)) + '</span>' +
      '<span class="dag-undir">' + esc(o.undir || '') + '</span></button>';
  }
  function dagHtml() {
    const a = D.ars || {}, p = (k) => (a[k] || {});
    const b = D.bord || {}, kn = D.kostn;
    const tengt = (n) => { const x = (D.postholf || []).find((y) => String(y.netfang).toLowerCase() === n); return x ? (x.tengt ? 'Gmail tengt' : 'Gmail ótengt') : 'Gmail ótengt'; };
    const bid = !D.lesid ? '…' : null;
    const arsUndir = (k) => (D.ars ? mkr(p(k).virdi) : (D.arsVilla || bid || '—'));
    const flisar = [
      flis({ merki: 'Ársskoðun · Í vinnslu', tala: D.ars ? p('ivinnslu').n : bid, undir: arsUndir('ivinnslu'), fara: 'ars:ivinnslu', tonn: 'blar' }),
      flis({ merki: 'Ársskoðun · Á eftir áætlun', tala: D.ars ? p('aeftir').n : bid, undir: arsUndir('aeftir'), fara: 'ars:aeftir', tonn: 'raudur' }),
      flis({ merki: 'Ársskoðun · Eftir ' + new Date().getFullYear(), tala: D.ars ? p('pending2026').n : bid, undir: arsUndir('pending2026'), fara: 'ars:pending2026', tonn: 'gulur' }),
      flis({ merki: 'Ársskoðun · Búið ' + new Date().getFullYear(), tala: D.ars ? p('done').n : bid, undir: arsUndir('done'), fara: 'ars:done', tonn: 'graenn' }),
      flis({ merki: 'Póstur í dag · eldklar@', tala: D.postur['eldklar@eldklar.is'] != null ? D.postur['eldklar@eldklar.is'] : bid, undir: tengt('eldklar@eldklar.is'), fara: 'reikninga-postur', tonn: tengt('eldklar@eldklar.is') === 'Gmail tengt' ? '' : 'raudur' }),
      flis({ merki: 'Póstur í dag · bokhald@', tala: D.postur['bokhald@eldklar.is'] != null ? D.postur['bokhald@eldklar.is'] : bid, undir: tengt('bokhald@eldklar.is'), fara: 'reikninga-postur', tonn: tengt('bokhald@eldklar.is') === 'Gmail tengt' ? '' : 'raudur' }),
      flis({ merki: 'Þjónustuborð · ný mál', tala: b.nytt != null ? b.nytt : bid, undir: (b.i_vinnslu != null ? b.i_vinnslu + ' í vinnslu · ' + (b.tilbuid || 0) + ' tilbúin' : ''), fara: 'bord' }),
      flis({ merki: 'Kostnaður · óyfirfarið', tala: kn ? kn.n : bid, undir: kn ? kr(kn.upphaed) : '', fara: 'kostnadur' }),
    ].join('');
    const dagskra = D.dagskra.length
      ? D.dagskra.slice(0, 10).map((j) => '<li><b>' + esc(j.allday ? 'Allan daginn' : (j.time || '')) + '</b>' + esc(j.name || '') + (j._n && j._n !== 'Allir' ? ' <span>· ' + esc(j._n) + '</span>' : '') + '</li>').join('') + (D.dagskra.length > 10 ? '<li><span>+ ' + (D.dagskra.length - 10) + ' í viðbót</span></li>' : '')
      : '<li><span>' + (D.lesid ? 'Ekkert skráð á dagskrá í dag.' : 'Sæki…') + '</span></li>';
    return '<div class="sam-haus"><span class="sam-titill">Dagurinn</span><span class="sam-plata">' + esc(hvenaer(new Date().toISOString()) ? idag().split('-').reverse().join('/') : '') + '</span>' +
        '<button type="button" class="sam-btn" data-dag="endurnyja">Endurnýja</button></div>' +
      '<div class="sam-buk"><div class="dag-grind">' + flisar + '</div>' +
        '<div class="dag-dagskra"><div class="sam-merki">Dagskrá í dag</div><ul>' + dagskra + '</ul>' +
          (D.nota ? '<div class="dag-nota">' + esc(D.nota) + '</div>' : '') +
          '<button type="button" class="sam-btn" data-fara="bord">Opna Þjónustuborð</button></div></div>';
  }
  let _dag = null;
  function teiknaDag() { if (_dag) _dag.innerHTML = dagHtml(); }
  function fara(k) {
    if (!k || !window.App || !App.switchView) return;
    const [view, sia] = k.split(':');
    App.switchView(view === 'ars' ? 'arsskodun' : view);
    if (view === 'ars' && sia) {
      // Síuflagan er sett með því að smella á hana, eins og notandinn gerði — engin önnur leið að stöðunni.
      let n = 0;
      const t = setInterval(() => {
        const b = document.querySelector('#view-arsskodun button._ars-st[data-status="' + sia + '"]');
        if (b || ++n > 40) { clearInterval(t); if (b) b.click(); }
      }, 150);
    }
  }

  // Staða hverrar línu lifir í breytu (ekki í DOM) — 61 teiknar #cc-main upp á nýtt við hverja opnun.
  const ST = {};   // id → { tima, aFerd, aukalega, keyrir, skilabod, villa }
  let _sec = null;

  function litur(r, s) {
    if (s && (s.keyrir || s.aFerd)) return 'blar';
    if (s && s.villa) return 'raudur';
    const a = aldurDaga(s && s.tima);
    return a <= r.gult ? 'graenn' : a <= r.rautt ? 'gulur' : 'raudur';
  }
  function linaHtml(r) {
    const s = ST[r.id] || {};
    const h = hvenaer(s.tima);
    const staduTexti = s.keyrir ? (s.skilabod || 'sæki…') : s.villa ? 'Villa: ' + s.villa : s.skilabod ? s.skilabod : (h ? 'Sótt ' + h : (s.lesid ? 'Aldrei sótt' : '…'));
    const takki = r.keyra
      ? '<button type="button" class="sam-btn" data-sam="' + r.id + '"' + (s.keyrir || s.aFerd ? ' disabled' : '') + '>' + (s.keyrir || s.aFerd ? 'Sæki…' : 'Sækja') + '</button>'
      : '<a class="sam-btn" href="' + esc(r.hlekkur) + '" target="_blank" rel="noopener" title="Opnar Brunahólf-hubbinn">Opna</a>';
    return '<div class="sam-lina">' +
      '<span class="sam-ljos ' + litur(r, s) + '" aria-hidden="true"></span>' +
      '<div class="sam-txt"><b>' + esc(r.heiti) + '</b><span>' + esc(r.undir) + '</span>' +
        '<span class="sam-stada" data-sam-stada="' + r.id + '">' + esc(staduTexti) + (s.aukalega && !s.keyrir && !s.villa ? ' · ' + esc(s.aukalega) : '') + '</span></div>' +
      takki +
    '</div>';
  }
  function innihald() {
    const hopar = ['Slökkvitæki', 'Brunahólf'];
    const keyranleg = RADIR.filter((r) => r.keyra && r.hopur === 'Slökkvitæki');
    const einhverKeyrir = keyranleg.some((r) => (ST[r.id] || {}).keyrir);
    return '<div class="sam-haus"><span class="sam-titill">Samstilling gagna</span>' +
        '<span class="sam-plata">' + RADIR.filter((r) => litur(r, ST[r.id]) === 'graenn').length + ' / ' + RADIR.length + ' fersk</span>' +
        '<button type="button" class="sam-btn malm" data-sam="__allt"' + (einhverKeyrir ? ' disabled' : '') + ' title="Sækir allt Slökkvitækis-megin, eitt í einu">Sækja allt</button></div>' +
      '<div class="sam-buk">' + hopar.map((hp) =>
        '<div class="sam-hopur"><div class="sam-merki">' + hp + '</div><div class="sam-grind">' + RADIR.filter((r) => r.hopur === hp).map(linaHtml).join('') + '</div></div>').join('') +
      '</div>';
  }
  function teikna() { if (_sec) _sec.innerHTML = innihald(); }

  async function lesaStodu() {
    await Promise.all(RADIR.map(async (r) => {
      try { const s = await r.stada(); ST[r.id] = Object.assign({}, ST[r.id], s || {}, { lesid: true }); }
      catch (_) { ST[r.id] = Object.assign({}, ST[r.id], { lesid: true }); }
    }));
    teikna();
  }
  async function keyra(id) {
    const r = RADIR.find((x) => x.id === id); if (!r || !r.keyra) return;
    const s = ST[id] = Object.assign({}, ST[id], { keyrir: true, villa: null, skilabod: 'sæki…' });
    teikna();
    try {
      const nidurstada = await r.keyra((t) => { s.skilabod = t; teikna(); });
      s.keyrir = false; s.skilabod = '✓ ' + nidurstada;
      try { Object.assign(s, await r.stada()); } catch (_) {}
      s.tima = s.tima || new Date().toISOString();
    } catch (e) {
      s.keyrir = false; s.villa = String((e && e.message) || e).slice(0, 120);
    }
    teikna();
  }
  async function keyraAllt() {
    for (const r of RADIR.filter((x) => x.keyra && x.hopur === 'Slökkvitæki')) await keyra(r.id);
  }

  function css() {
    if (document.getElementById('_sam420-css')) return;
    const V = '#view-stjornstod ._sam420 ';
    const st = document.createElement('style');
    st.id = '_sam420-css';
    st.textContent = [
      '#view-stjornstod ._sam420{position:relative;background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);overflow:hidden;margin:0 0 20px;font-family:' + SANS + ';color:#141822}',
      V + '.sam-haus{position:relative;display:flex;align-items:center;gap:10px;min-height:46px;padding:5px 16px 5px 20px;background:' + METAL + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.1);border-bottom:1px solid #000;color:#fff;flex-wrap:wrap}',
      V + '.sam-haus::before{' + RIVET + ';left:7px}' + V + '.sam-haus::after{' + RIVET + ';right:7px}',
      V + '.sam-titill{font:600 15px ' + SANS + ';text-shadow:0 1px 1px rgba(0,0,0,.6);margin-right:auto}',
      V + '.sam-plata{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';font:700 10.5px ' + MONO + ';letter-spacing:.06em;text-transform:uppercase;color:#1f2530;white-space:nowrap}',
      V + '.sam-buk{padding:12px 14px;display:flex;flex-direction:column;gap:12px}',
      V + '.sam-merki{font:700 11px ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#3a4250;margin:0 0 6px}',
      V + '.sam-grind{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:8px}',
      V + '.sam-lina{display:flex;align-items:center;gap:10px;min-height:62px;padding:8px 10px;background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);min-width:0}',
      V + '.sam-ljos{flex:0 0 10px;width:10px;height:10px;border-radius:50%;box-shadow:inset 0 -1px 1px rgba(0,0,0,.35)}',
      V + '.sam-ljos.graenn{background:#1f9d55}' + V + '.sam-ljos.gulur{background:#d69e2e}' + V + '.sam-ljos.raudur{background:#c53030}' + V + '.sam-ljos.blar{background:#3a6fd8}',
      V + '.sam-txt{display:flex;flex-direction:column;min-width:0;flex:1}',
      V + '.sam-txt b{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      V + '.sam-txt span{font-size:11.5px;color:#5b6573;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      V + '.sam-txt .sam-stada{font-family:' + MONO + ';font-size:11px;color:#3a4250}',
      V + '.sam-btn{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;min-width:74px;height:36px;padding:0 12px;border-radius:9px;border:1px solid rgba(20,24,34,.16);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530;font:600 12.5px ' + SANS + ';cursor:pointer;text-decoration:none;white-space:nowrap}',
      V + '.sam-btn.malm{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border-color:#000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4}',
      V + '.sam-btn[disabled]{opacity:.38;pointer-events:none}',
      V + '.dag-grind{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}',
      V + '.dag-flis{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:96px;padding:10px 12px 10px 16px;text-align:left;background:#fff;border:0;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);cursor:pointer;font:inherit;color:#141822;min-width:0}',
      V + '.dag-flis:hover{filter:brightness(.97)}',
      V + '.dag-flis::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:4px;border-radius:0 3px 3px 0;background:#8f98a8}',
      V + '.dag-flis.blar::before{background:#3a6fd8}' + V + '.dag-flis.raudur::before{background:#c53030}' + V + '.dag-flis.gulur::before{background:#d69e2e}' + V + '.dag-flis.graenn::before{background:#1f9d55}',
      V + '.dag-merki{font:700 10.5px ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;color:#3a4250}',
      V + '.dag-tala{font:800 32px/1.05 "Playfair Display",Georgia,serif;font-variant-numeric:lining-nums;color:#141822}',
      V + '.dag-undir{font:500 12px ' + MONO + ';color:#5b6573;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
      V + '.dag-dagskra{display:flex;flex-direction:column;gap:6px;padding:10px 12px;background:#fff;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)}',
      V + '.dag-dagskra ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px}',
      V + '.dag-dagskra li{font-size:13px}' + V + '.dag-dagskra li b{font-family:' + MONO + ';font-size:12px;margin-right:8px}' + V + '.dag-dagskra li span{color:#5b6573}',
      V + '.dag-nota{white-space:pre-wrap;font-size:12.5px;color:#3a4250;padding:6px 8px;background:#f4f6f9;border-radius:4px}',
      V + '.dag-dagskra .sam-btn{align-self:flex-start}',
    ].join('\n');
    document.head.appendChild(st);
  }

  // Sett inn beint undir kveðjuna, í sama verki og 61 teiknar (upprunalegi MO keyrir fyrir málun).
  function setjaInn() {
    const main = document.getElementById('cc-main');
    if (!main) return false;
    const hylki = main.firstElementChild;                        // <div style="max-width:1280px">
    const kvedja = hylki && hylki.firstElementChild;
    if (!kvedja || !kvedja.querySelector('h1')) return false;     // 61 er enn með „hleður…"
    if (_dag && _sec && _dag.parentNode === hylki && _dag.previousElementSibling === kvedja && _sec.previousElementSibling === _dag) return true;
    if (!_dag) {
      _dag = document.createElement('section');
      _dag.className = '_sam420 _dag420';
      _dag.setAttribute('aria-label', 'Dagurinn');
      _dag.addEventListener('click', (e) => {
        const f = e.target.closest('[data-fara]'); if (f) { fara(f.dataset.fara); return; }
        if (e.target.closest('[data-dag="endurnyja"]')) { D.lesid = false; teiknaDag(); lesaDaginn(); lesaStodu(); }
      });
      teiknaDag();
    }
    if (!_sec) {
      _sec = document.createElement('section');
      _sec.className = '_sam420';
      _sec.setAttribute('aria-label', 'Samstilling gagna');
      _sec.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-sam]'); if (!b) return;
        if (b.dataset.sam === '__allt') keyraAllt(); else keyra(b.dataset.sam);
      });
      teikna();
    }
    kvedja.insertAdjacentElement('afterend', _dag);
    _dag.insertAdjacentElement('afterend', _sec);
    return true;
  }
  let _vakt = null, _sidastLesid = 0;
  function vakta() {
    const v = document.getElementById('view-stjornstod');
    if (!v) return false;
    if (!_vakt) {
      css();
      const MO = window.__NativeMutationObserver || MutationObserver;
      _vakt = new MO(() => {
        if (!v.classList.contains('active')) return;
        if (setjaInn() && Date.now() - _sidastLesid > 30000) { _sidastLesid = Date.now(); lesaStodu(); lesaDaginn(); }
      });
      _vakt.observe(v, { childList: true, subtree: true });
    }
    if (v.classList.contains('active') && setjaInn() && Date.now() - _sidastLesid > 30000) { _sidastLesid = Date.now(); lesaStodu(); lesaDaginn(); }
    return true;
  }
  let _tilraunir = 0;
  (function start() { if (!vakta() && ++_tilraunir < 60) setTimeout(start, 500); })();
  // Sýnin er virkjuð með klasa (61 patchSwitch) — lesa stöðuna upp á nýtt þegar hún opnast, mest á 30 sek fresti.
  document.addEventListener('view-shown', (e) => { if (e && e.detail && e.detail.name === 'stjornstod') setTimeout(vakta, 0); });

  window.Samstilling = { keyra, keyraAllt, lesaStodu, version: 'v1' };
})();
/* === END STJÓRNSTÖÐ — SAMSTILLING GAGNA === */
