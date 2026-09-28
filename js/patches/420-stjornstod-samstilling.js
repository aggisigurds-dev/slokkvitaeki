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
  const D = { lesid: false, ars: null, arsVilla: '', postur: {}, postholf: [], bord: {}, kostn: null, vinnublod: null, osendar: null, hreinsa: null, hreinsaVilla: '' };
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
    if (c) {
      // Óklárað vinnublað = bíður yfirferðar (sara_yfirferd.stada='bidur') — það sem Vinnublaða-hamur Þjónustuborðs vinnur úr.
      verk.push(c.from('sara_yfirferd').select('id', { count: 'exact', head: true }).eq('stada', 'bidur')
        .then(({ count }) => { D.vinnublod = count == null ? null : count; }));
      // Ósendar kröfur — sama regla og spjaldið „Ósendar kröfur" í Kröfu yfirliti (166, _state.osendar): ógreidd
      // reikningssala án sendingarmerkis, ekki ógild, og hvorki kreditnóta né sala sem kreditnóta leggst á móti.
      verk.push(c.from('solur').select('id,samtals,status,is_credit,credit_of,krafa_sent_at,invoiced_at,dk_invoice_id').eq('greitt_med', 'reikningur').is('paid_at', null).range(0, 999)
        .then(({ data }) => {
          if (!data) return;
          const kred = new Set(data.filter((s) => s.is_credit && s.credit_of != null).map((s) => String(s.credit_of)));
          const l = data.filter((s) => !s.is_credit && !kred.has(String(s.id)) && s.status !== 'void' && !s.krafa_sent_at && !s.invoiced_at && !s.dk_invoice_id);
          D.osendar = { n: l.length, upphaed: l.reduce((s2, r) => s2 + (+r.samtals || 0), 0) };
        }));
    }
    verk.push(finnaKlarud().then((l) => { D.hreinsa = l; D.hreinsaVilla = ''; }, (e) => { D.hreinsa = null; D.hreinsaVilla = 'Gat ekki borið málin saman: ' + String((e && e.message) || e); }));
    verk.push(stjornstodStada().then((ss) => { D.postholf = ss.postholf || []; }));
    await Promise.all(verk.map((p) => Promise.resolve(p).catch(() => {})));
    D.lesid = true;
    teiknaDag();
    teiknaViku();
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
      flis({ merki: 'Ársskoðun · Í vinnslu', tala: D.ars ? p('ivinnslu').n : bid, undir: arsUndir('ivinnslu'), fara: 'thjonustu-verkstaedi', tonn: 'blar' }),
      flis({ merki: 'Ársskoðun · Á eftir áætlun', tala: D.ars ? p('aeftir').n : bid, undir: arsUndir('aeftir'), fara: 'ars:aeftir', tonn: 'raudur' }),
      flis({ merki: 'Ársskoðun · Eftir ' + new Date().getFullYear(), tala: D.ars ? p('pending2026').n : bid, undir: arsUndir('pending2026'), fara: 'ars:pending2026', tonn: 'gulur' }),
      flis({ merki: 'Ársskoðun · Búið ' + new Date().getFullYear(), tala: D.ars ? p('done').n : bid, undir: arsUndir('done'), fara: 'ars:done', tonn: 'graenn' }),
      flis({ merki: 'Póstur í dag · eldklar@', tala: D.postur['eldklar@eldklar.is'] != null ? D.postur['eldklar@eldklar.is'] : bid, undir: tengt('eldklar@eldklar.is'), fara: 'thjonustuver-postar', tonn: tengt('eldklar@eldklar.is') === 'Gmail tengt' ? '' : 'raudur' }),
      flis({ merki: 'Póstur í dag · bokhald@', tala: D.postur['bokhald@eldklar.is'] != null ? D.postur['bokhald@eldklar.is'] : bid, undir: tengt('bokhald@eldklar.is'), fara: 'thjonustuver-postar', tonn: tengt('bokhald@eldklar.is') === 'Gmail tengt' ? '' : 'raudur' }),
      flis({ merki: 'Þjónustuborð · ný mál', tala: b.nytt != null ? b.nytt : bid, undir: (b.i_vinnslu != null ? b.i_vinnslu + ' í vinnslu · ' + (b.tilbuid || 0) + ' tilbúin' : ''), fara: 'bord' }),
      flis({ merki: 'Vinnublöð · óklárað', tala: D.vinnublod != null ? D.vinnublod : bid, undir: 'bíða yfirferðar', fara: 'bord:vinnublod', tonn: D.vinnublod ? 'gulur' : '' }),
      flis({ merki: 'Kröfur · ósendar', tala: D.osendar ? D.osendar.n : bid, undir: D.osendar ? kr(D.osendar.upphaed) : '', fara: 'krofu:osendar', tonn: D.osendar && D.osendar.n ? 'raudur' : '' }),
      flis({ merki: 'Kostnaður · óyfirfarið', tala: kn ? kn.n : bid, undir: kn ? kr(kn.upphaed) : '', fara: 'kostnadur' }),
    ].join('');
    return '<div class="sam-haus"><span class="sam-titill">Dagurinn</span><span class="sam-plata">' + esc(hvenaer(new Date().toISOString()) ? idag().split('-').reverse().join('/') : '') + '</span>' +
        hreinsaTakki() + '<button type="button" class="sam-btn" data-dag="endurnyja">Endurnýja</button></div>' +
      '<div class="sam-buk"><div class="dag-grind">' + flisar + '</div>' + hreinsaHtml() + '</div>';
  }
  /* ── HREINSA ÞJÓNUSTUBORÐ (Agnar 28.09.2026: „button that cleans out from þjónustuborð connected issues — when some
   *    issue is to finish sending an invoice or make a report, the system checks if the invoice is sent and marks the
   *    issue as done"). Aðeins mál með HARÐA tengingu eru skoðuð — ekkert giskað á nafn eða lausan texta:
   *      payday-xml-sala:<id>   XML hafnað        → lokið þegar reikningurinn er greiddur eða ógiltur (rafræni reikningurinn
   *                                                  skiptir þá ekki lengur máli)
   *      payday:<nr>            ekkert XML/póstur  → lokið þegar Payday-reikningurinn er greiddur
   *      sala:R-… (eða R-nr í titli „krafa aldrei send / á að rukka / rukka eða ógilda / senda kröfu")
   *                                                → lokið þegar krafan er send, salan greidd eða ógild
   *      vinnublad-stadfesting + sara:<id>         → lokið þegar vinnublaðið er klárað (sara_yfirferd.stada='klarad')
   *      klara-heimsokn / „enginn reikningur" + fyrirtæki
   *                                                → lokið þegar reikningur á SAMA fyrirtæki (solur.customer_id) varð til eftir
   *                                                  að málið stofnaðist (−2 dagar) og krafan er send eða greidd
   *      senda_skyrslur + fyrirtæki                → lokið þegar skýrsla fyrirtækisins er dagsett eftir að málið stofnaðist
   *    „Send" = krafa_sent_at / invoiced_at / paid_at — EKKI dk_invoice_id eitt og sér (drög í Payday teljast ósend, 166).
   *    Lokun: status='lokad' + merkið lokad:stjornstod + lína í notes, skilyrt á updated_at og lesin til baka.
   *    Afturkalla setur fyrra ástand aftur (skilyrt á að enginn hafi breytt málinu síðan). ── */
  const tagsAf = (r) => (Array.isArray(r.tags) ? r.tags.map(String) : []);
  const dmy = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };
  const sent = (s) => s.krafa_sent_at || s.invoiced_at || s.paid_at;
  async function finnaKlarud() {
    const c = sb(); if (!c) return null;
    const { data: mal, error } = await c.from('thjonustubeidni').select('id,title,status,created_at,updated_at,fyrirtaeki_id,tags,notes')
      .is('deleted_at', null).is('archived_at', null).neq('status', 'lokad').order('id').range(0, 999);
    if (error) throw error;
    const flokkad = [];
    for (const r of mal || []) {
      const t = tagsAf(r), finna = (re) => { for (const x of t) { const m = x.match(re); if (m) return m[1]; } return null; };
      const xml = finna(/^payday-xml-sala:(\d+)$/), pd = finna(/^payday:(\d+)$/);
      const rNum = finna(/^sala:(R-\d+)$/) || (/(krafa aldrei send|rukka eða ógilda|á að rukka|senda kröfu)/i.test(r.title || '') ? ((r.title || '').match(/R-\d{6}/) || [])[0] : null);
      const sara = t.indexOf('vinnublad-stadfesting') >= 0 ? finna(/^sara:(\d+)$/) : null;
      if (xml) flokkad.push({ r, regla: 'xml', lykill: +xml });
      else if (pd) flokkad.push({ r, regla: 'payday', lykill: pd });
      else if (rNum) flokkad.push({ r, regla: 'sala', lykill: rNum });
      else if (sara) flokkad.push({ r, regla: 'vinnublad', lykill: +sara });
      else if (r.fyrirtaeki_id && (t.indexOf('klara-heimsokn') >= 0 || /enginn reikningur/i.test(r.title || ''))) flokkad.push({ r, regla: 'reikningur', lykill: +r.fyrirtaeki_id });
      else if (r.fyrirtaeki_id && t.indexOf('senda_skyrslur') >= 0) flokkad.push({ r, regla: 'skyrsla', lykill: +r.fyrirtaeki_id });
    }
    const lyklar = (regla) => Array.from(new Set(flokkad.filter((x) => x.regla === regla).map((x) => x.lykill)));
    const bita = async (listi, fall) => {
      const out = [];
      for (let i = 0; i < listi.length; i += 150) { const { data, error: e } = await fall(listi.slice(i, i + 150)); if (e) throw e; out.push(...(data || [])); }
      return out;
    };
    const [xmlS, pdS, rS, vbS, rkS, skS] = await Promise.all([
      bita(lyklar('xml'), (l) => c.from('solur').select('id,num,status,paid_at').in('id', l).range(0, 999)),
      bita(lyklar('payday'), (l) => c.from('payday_invoices_slokk').select('number,paid_date').in('number', l).range(0, 999)),
      bita(lyklar('sala'), (l) => c.from('solur').select('id,num,status,paid_at,krafa_sent_at,invoiced_at').in('num', l).range(0, 999)),
      bita(lyklar('vinnublad'), (l) => c.from('sara_yfirferd').select('id,stada').in('id', l).range(0, 999)),
      bita(lyklar('reikningur'), (l) => c.from('solur').select('id,num,customer_id,samtals,created_at,paid_at,krafa_sent_at,invoiced_at,is_credit')
        .in('customer_id', l).eq('status', 'final').eq('greitt_med', 'reikningur').gte('created_at', new Date(Date.now() - 400 * 864e5).toISOString())
        .order('created_at', { ascending: false }).range(0, 999)),
      bita(lyklar('skyrsla'), (l) => c.from('fyrirtaeki_virkni').select('fyrirtaeki_id,sidasta_skyrsla').in('fyrirtaeki_id', l).range(0, 999)),
    ]);
    const out = [];
    for (const x of flokkad) {
      let astaeda = null;
      if (x.regla === 'xml') {
        const s = xmlS.find((y) => y.id === x.lykill);
        if (s && s.status === 'void') astaeda = s.num + ' ógiltur';
        else if (s && s.paid_at) astaeda = s.num + ' greiddur ' + dmy(s.paid_at);
      } else if (x.regla === 'payday') {
        const s = pdS.find((y) => String(y.number) === String(x.lykill));
        if (s && s.paid_date) astaeda = 'Payday ' + x.lykill + ' greiddur ' + dmy(s.paid_date);
      } else if (x.regla === 'sala') {
        const s = rS.find((y) => y.num === x.lykill);
        if (s && s.status === 'void') astaeda = s.num + ' ógilt';
        else if (s && s.paid_at) astaeda = s.num + ' greitt ' + dmy(s.paid_at);
        else if (s && sent(s)) astaeda = 'Krafa ' + s.num + ' send ' + dmy(s.krafa_sent_at || s.invoiced_at);
      } else if (x.regla === 'vinnublad') {
        const s = vbS.find((y) => y.id === x.lykill);
        if (s && s.stada === 'klarad') astaeda = 'Vinnublaðið er klárað';
      } else if (x.regla === 'reikningur') {
        const fra = new Date(x.r.created_at).getTime() - 2 * 864e5;
        const s = rkS.find((y) => y.customer_id === x.lykill && !y.is_credit && new Date(y.created_at).getTime() >= fra && sent(y));
        if (s) astaeda = 'Reikningur ' + s.num + ' (' + kr(s.samtals) + ') ' + (s.paid_at ? 'greiddur ' + dmy(s.paid_at) : 'sendur ' + dmy(s.krafa_sent_at || s.invoiced_at));
      } else if (x.regla === 'skyrsla') {
        const v = skS.find((y) => y.fyrirtaeki_id === x.lykill), sk = v && v.sidasta_skyrsla;
        if (sk && sk.dags && String(sk.dags).slice(0, 10) >= String(x.r.created_at).slice(0, 10)) astaeda = 'Skýrsla dagsett ' + dmy(sk.dags);
      }
      if (astaeda) out.push({ r: x.r, regla: x.regla, astaeda });
    }
    return out;
  }
  // Lokanir þessarar lotu, svo hægt sé að afturkalla: id → { fyrra: {status,tags,notes}, nyttUpdated, titill, astaeda, afturkallad }
  const LOKAD = new Map();
  let _hreinsar = false, _hreinsaSkilabod = '';
  function hreinsaTakki() {
    const n = D.hreinsa ? D.hreinsa.length : null;
    const titill = D.hreinsa && n ? D.hreinsa.map((x) => '#' + x.r.id + ' ' + x.r.title + ' — ' + x.astaeda).join('\n') : 'Engin tengd mál sem kerfið sér að eru kláruð.';
    return '<button type="button" class="sam-btn malm" data-dag="hreinsa"' + (_hreinsar || !n ? ' disabled' : '') + ' title="' + esc(titill) + '">' +
      (_hreinsar ? 'Hreinsa…' : 'Hreinsa Þjónustuborð' + (n != null ? ' · ' + n : '')) + '</button>';
  }
  function hreinsaHtml() {
    if (!LOKAD.size && !_hreinsaSkilabod && !D.hreinsaVilla) return '';
    const linur = Array.from(LOKAD.entries()).map(([id, x]) => '<li class="' + (x.afturkallad ? 'aftur' : '') + '"><b>#' + id + '</b>' +
      '<span class="hr-titill">' + esc(x.titill) + '</span>' +
      '<span class="hr-ast">' + esc(x.afturkallad ? 'Afturkallað — opið aftur' : x.astaeda) + '</span>' +
      (x.afturkallad ? '' : '<button type="button" class="sam-btn" data-dag="aftur" data-id="' + id + '">Afturkalla</button>') + '</li>').join('');
    return '<div class="dag-hreinsun"><div class="sam-merki">Hreinsun Þjónustuborðs</div>' +
      (D.hreinsaVilla ? '<p class="hr-villa">' + esc(D.hreinsaVilla) + '</p>' : '') +
      (_hreinsaSkilabod ? '<p class="hr-skil">' + esc(_hreinsaSkilabod) + '</p>' : '') +
      (linur ? '<ul>' + linur + '</ul>' : '') + '</div>';
  }
  async function hreinsa() {
    const c = sb(); if (!c || _hreinsar) return;
    _hreinsar = true; _hreinsaSkilabod = ''; teiknaDag();
    let lokad = 0, sleppt = 0, villur = 0, villa = '';
    try {
      const listi = await finnaKlarud();   // lesið aftur rétt fyrir lokun — staðan gæti hafa breyst síðan talan birtist
      for (const x of listi || []) {
        const r = x.r, tags = tagsAf(r);
        const nyTags = tags.indexOf('lokad:stjornstod') >= 0 ? tags : tags.concat('lokad:stjornstod');
        const lina = '[' + dmy(new Date().toISOString()) + ' Stjórnstöð] Lokað sjálfvirkt: ' + x.astaeda;
        let q = c.from('thjonustubeidni')
          .update({ status: 'lokad', tags: nyTags, notes: (r.notes ? r.notes + '\n' : '') + lina, updated_at: new Date().toISOString() }).eq('id', r.id);
        q = r.updated_at ? q.eq('updated_at', r.updated_at) : q.is('updated_at', null);   // sama skilyrði og 368
        const { data, error } = await q.select('id,status,updated_at');
        if (!error && data && data[0] && data[0].status === 'lokad') {
          lokad++;
          LOKAD.set(r.id, { fyrra: { status: r.status, tags: r.tags, notes: r.notes }, nyttUpdated: data[0].updated_at, titill: r.title, astaeda: x.astaeda });
        } else if (error) { villur++; villa = villa || ((error && error.message) || String(error)); }
        else sleppt++;   // 0 raðir = updated_at breyttist — einhver annar snerti málið á meðan
      }
      const hlutar = [];
      if (lokad) hlutar.push('Lokaði ' + lokad + (lokad === 1 ? ' máli' : ' málum'));
      if (sleppt) hlutar.push(sleppt + ' breyttust á meðan og var sleppt');
      if (villur) hlutar.push(villur + ' vistuðust ekki (' + villa + ')');
      _hreinsaSkilabod = hlutar.length ? hlutar.join(' · ') + '.' : 'Ekkert tengt mál var klárað.';
    } catch (e) { _hreinsaSkilabod = 'Hreinsun mistókst: ' + ((e && e.message) || e); }
    _hreinsar = false;
    D.lesid = false; teiknaDag(); lesaDaginn();
  }
  async function afturkalla(id) {
    const c = sb(), x = LOKAD.get(id); if (!c || !x || x.afturkallad) return;
    const { data, error } = await c.from('thjonustubeidni').update(Object.assign({}, x.fyrra, { updated_at: new Date().toISOString() }))
      .eq('id', id).eq('updated_at', x.nyttUpdated).select('id,status');
    if (!error && data && data[0] && data[0].status === x.fyrra.status) { x.afturkallad = true; _hreinsaSkilabod = 'Mál #' + id + ' er opið aftur.'; }
    else _hreinsaSkilabod = 'Mál #' + id + ' var breytt eftir lokun — afturköllun sleppt. Opnaðu það á Þjónustuborði.';
    D.lesid = false; teiknaDag(); lesaDaginn();
  }

  let _dag = null;
  function teiknaDag() { if (_dag) _dag.innerHTML = dagHtml(); }

  /* ── Vikan — sama dagskrá og á Þjónustuborði (368): verk ALLRA starfsmanna næstu 7 daga, ein dagskrá fyrir alla.
   *    Lesið úr AppSettings (vikudagskra.by_staff.<nafn>.jobs) — sama heimild og 368/303, svo allar vélar sjá það sama.
   *    Smellur á verk opnar 303-gluggann á grein eigandans; „+" skráir nýtt verk á daginn. ── */
  const DAGAR = ['SUN', 'MÁN', 'ÞRI', 'MIÐ', 'FIM', 'FÖS', 'LAU'];
  const VD_TEG = [['Árskoðun', '#4f7dff'], ['Brunakerfiskoðun', '#e0493c'], ['Fund', '#9b6bff'], ['Uppsetning', '#f0a53a'], ['Annað', '#3fbf6f']];
  const vdLitur = (t) => (VD_TEG.find((x) => x[0] === t) || [0, '#a89f8c'])[1];
  const AP = (k) => { try { return window.AppSettings && AppSettings.path ? AppSettings.path(k) : undefined; } catch (_) { return undefined; } };
  function starfsfolk() {
    let l = [];
    try { l = (window.BordStarfsmadur && BordStarfsmadur.list()) || []; } catch (_) {}
    const by = AP('vikudagskra.by_staff') || {};
    l = l.concat(Object.keys(by));
    if (!l.length) l = ['Agnar', 'Bjarndís', 'Binni', 'Anni', 'Hákon', 'Afgreiðsla', 'Charlize', 'Allir'];
    return l.filter((x, i) => x && l.indexOf(x) === i);
  }
  function jobsAf(n) {
    const j = AP('vikudagskra.by_staff.' + n + '.jobs');
    if (Array.isArray(j)) return j.filter(Boolean);
    if (n === 'Agnar') { const g = AP('vikudagskra.jobs'); if (Array.isArray(g)) return g.filter(Boolean); }
    return [];
  }
  function allirJobs() {
    const out = [], sed = new Set();
    for (const n of starfsfolk()) for (const j of jobsAf(n)) {
      const k = j.id != null ? String(j.id) : n + '|' + j.date + '|' + j.time + '|' + j.name;
      if (sed.has(k)) continue; sed.add(k);
      out.push(Object.assign({ _n: n }, j));
    }
    return out;
  }
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function dagnota(key) {
    const s = String(AP('skipulagsbord.by_staff.Allir.dagnotur.' + key) || '').trim();
    if (s) return s;
    return starfsfolk().filter((x) => x !== 'Allir').map((x) => String(AP('skipulagsbord.by_staff.' + x + '.dagnotur.' + key) || '').trim()).filter(Boolean).join('\n');
  }
  function vikan() {
    const jobs = allirJobs(), d0 = new Date(), out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i), key = ymd(d);
      out.push({
        key, d: DAGAR[d.getDay()], n: d.getDate(), m: d.getMonth() + 1, today: i === 0, helgi: d.getDay() === 0 || d.getDay() === 6,
        nota: dagnota(key),
        jobs: jobs.filter((j) => String(j.date || '').slice(0, 10) === key)
          .sort((a, b) => (a.allday ? 0 : 1) - (b.allday ? 0 : 1) || String(a.time || '').localeCompare(String(b.time || ''))),
      });
    }
    return out;
  }
  function vikaHtml() {
    const tilbuin = !!(window.AppSettings && AppSettings.path);
    const dagar = vikan(), alls = dagar.reduce((s2, d) => s2 + d.jobs.length, 0);
    const f = dagar[0], l = dagar[6], dm = (d) => String(d.n).padStart(2, '0') + '/' + String(d.m).padStart(2, '0');
    const verk = (j) => '<button type="button" class="vk-verk" data-vk="verk" data-jid="' + esc(j.id == null ? '' : j.id) + '" data-n="' + esc(j._n) + '" style="--lit:' + vdLitur(j.type) + '" title="' + esc((j.type ? j.type + ' — ' : '') + 'smelltu til að breyta') + '">' +
      '<span class="vk-timi">' + esc(j.allday ? 'Allan daginn' : (j.time || '—')) + (j._n && j._n !== 'Allir' ? '<i>' + esc(j._n) + '</i>' : '') + '</span>' +
      '<span class="vk-nafn">' + esc(j.name || '(ónefnt)') + '</span>' +
      (j.note ? '<span class="vk-ath">' + esc(String(j.note).slice(0, 80)) + '</span>' : '') + '</button>';
    const dagur = (d) => '<div class="vk-dagur' + (d.today ? ' idag' : '') + (d.helgi ? ' helgi' : '') + '">' +
      '<div class="vk-dh"><span class="vk-dn">' + d.d + '</span><span class="vk-dd">' + d.n + '</span>' +
        (d.today ? '<span class="vk-idag">Í dag</span>' : '') + '<span class="vk-bil"></span>' +
        '<button type="button" class="vk-plus" data-vk="nytt" data-date="' + d.key + '" aria-label="Skrá verk ' + d.d + ' ' + d.n + '.">+</button></div>' +
      '<div class="vk-verkin">' + (d.jobs.length ? d.jobs.map(verk).join('') : '<span class="vk-autt">' + (tilbuin ? 'Ekkert skráð' : 'Sæki…') + '</span>') + '</div>' +
      (d.nota ? '<div class="vk-nota">' + esc(d.nota.length > 160 ? d.nota.slice(0, 160) + '…' : d.nota) + '</div>' : '') +
    '</div>';
    return '<div class="sam-haus"><span class="sam-titill">Vikan</span><span class="sam-plata">' + dm(f) + ' – ' + dm(l) + ' · ' + alls + ' verk</span>' +
        '<button type="button" class="sam-btn" data-fara="bord">Þjónustuborð</button>' +
        '<button type="button" class="vk-gull" data-vk="nytt" data-date="' + f.key + '">+ Skrá verk</button></div>' +
      '<div class="vk-gulllina" aria-hidden="true"></div>' +
      '<div class="vk-buk"><div class="vk-vika">' + dagar.map(dagur).join('') + '</div>' +
        '<div class="vk-skyring">' + VD_TEG.map((t) => '<span><i style="background:' + t[1] + '"></i>' + t[0] + '</span>').join('') + '</div></div>';
  }
  let _vik = null;
  function teiknaViku() { if (_vik) _vik.innerHTML = vikaHtml(); }
  function vikaSmellur(e) {
    const f = e.target.closest('[data-fara]'); if (f) { fara(f.dataset.fara); return; }
    const b = e.target.closest('[data-vk]'); if (!b) return;
    if (!window.Vikudagskra || !Vikudagskra.open) { alert('Dagskrárglugginn er ekki hlaðinn.'); return; }
    try {
      if (b.dataset.vk === 'nytt') { Vikudagskra.open(b.dataset.date); return; }
      const j = allirJobs().find((x) => String(x.id) === b.dataset.jid);
      if (!j || j.id == null) { teiknaViku(); return; }
      const { _n, ...hreint } = j;   // vistast á grein eigandans, eins og á Þjónustuborði (368/303)
      Vikudagskra.open(j.date, hreint, _n);
    } catch (_) { alert('Dagskrárglugginn opnaðist ekki.'); }
  }
  document.addEventListener('vikudagskra-breytt', () => setTimeout(teiknaViku, 0));
  function fara(k) {
    if (!k || !window.App || !App.switchView) return;
    const [view, sia] = k.split(':');
    // Smellir á takkann eins og notandinn gerði — og sannreynir að hann TÓK. Síður binda smelli eftir að gögnin lenda
    // (166 bindur _ky-vf eftir hleðslu), svo fyrsti takkinn sem sést getur verið beinagrind án hlustara. Reynt aftur
    // á 1,2 sek fresti þar til takkinn er virkur, mest 3 smellir á 15 sek.
    const smella = (fa, sel) => {
      let n = 0, smellir = 0, sidast = 0;
      const virkur = (b) => b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true' || b.classList.contains('is-active');
      const t = setInterval(() => {
        const b = fa(sel);
        if (++n > 50 || (b && virkur(b))) { clearInterval(t); return; }
        if (b && smellir < 3 && Date.now() - sidast > 1200) { smellir++; sidast = Date.now(); b.click(); }
      }, 300);
    };
    if (view === 'bord') {
      App.switchView('bord');
      // Hamurinn á Þjónustuborði (368) er valinn með hamatakkanum í skuggarótinni — sama leið og smellur.
      if (sia) smella((q) => { const v = document.getElementById('view-bord'); return v && v.shadowRoot ? v.shadowRoot.querySelector(q) : null; }, 'button[data-t5="mode"][data-mode="' + sia + '"]');
      return;
    }
    if (view === 'krofu') {
      App.switchView('krofu-yfirlit');
      if (sia) smella((q) => document.querySelector(q), '#view-krofu-yfirlit ._ky-vf[data-vf="' + sia + '"]');
      return;
    }
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
    const K = '#view-stjornstod ._vik420 ';
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
      V + '.dag-hreinsun{display:flex;flex-direction:column;gap:6px;padding:10px 12px;background:#fff;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)}',
      V + '.dag-hreinsun ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px}',
      V + '.dag-hreinsun li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"nr t b" "nr a b";column-gap:10px;align-items:center;padding:6px 8px;border-radius:4px;background:#f6f7f9}',
      V + '.dag-hreinsun li b{grid-area:nr;font:700 11.5px ' + MONO + ';color:#3a4250}' + V + '.dag-hreinsun li .sam-btn{grid-area:b;min-width:0;height:30px}',
      V + '.hr-titill{grid-area:t;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' + V + '.hr-ast{grid-area:a;font:500 11.5px ' + MONO + ';color:#1f7a45}',
      V + '.dag-hreinsun li.aftur .hr-ast{color:#5b6573}' + V + '.hr-skil{margin:0;font:600 12.5px ' + SANS + ';color:#141822}' + V + '.hr-villa{margin:0;font-size:12.5px;color:#c53030}',
      V + '.dag-undir{font:500 12px ' + MONO + ';color:#5b6573;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
      // Vikan — Boss (svart stál, rjómi, gull) blandað mjúku gulli Jarvis: dökk plata, hlýr ljómi, í dag glóir.
      '#view-stjornstod ._vik420{background:radial-gradient(ellipse 70% 120% at 12% 0%,rgba(255,200,90,.10) 0%,rgba(255,200,90,0) 60%),linear-gradient(160deg,#26241f 0%,#151412 40%,#0c0c0b 100%);border-color:#000;color:#f4f1ea;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),inset 0 0 0 1px rgba(226,196,111,.14),0 18px 40px -12px rgba(0,0,0,.7),0 0 46px -14px rgba(255,200,90,.28)}',
      K + '.vk-gulllina{height:2px;background:linear-gradient(90deg,rgba(122,90,18,0) 0%,#c9a54a 14%,#f5d76e 36%,#fff3b0 48%,#f5d76e 60%,#c9a54a 84%,rgba(122,90,18,0) 100%);box-shadow:0 0 12px rgba(255,210,120,.55)}',
      K + '.vk-gull{display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 14px;border-radius:9px;border:1px solid #5a4410;border-top-color:#f7e6b8;border-bottom-color:#2e2004;background:linear-gradient(115deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.5) 45%,rgba(255,255,255,0) 52%),linear-gradient(180deg,#f3dc95 0%,#d9b25a 14%,#b8892e 46%,#8f6a1c 52%,#a87b1f 74%,#cfa54a 92%,#e8cb7a 100%);color:#161513;font:800 12.5px ' + SANS + ';text-shadow:0 1px 0 rgba(255,255,255,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 -2px 3px rgba(60,40,0,.45),0 3px 6px rgba(0,0,0,.45),0 0 14px rgba(255,200,90,.35);cursor:pointer;white-space:nowrap}',
      K + '.vk-gull:hover{filter:brightness(1.06)}',
      K + '.vk-buk{padding:14px;display:flex;flex-direction:column;gap:10px}',
      K + '.vk-vika{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}',
      K + '.vk-dagur{position:relative;display:flex;flex-direction:column;gap:8px;min-width:0;min-height:168px;padding:9px 9px 10px;border-radius:7px;border:1px solid #2a2823;background:linear-gradient(180deg,#121110 0%,#0a0a09 100%);box-shadow:inset 0 2px 6px rgba(0,0,0,.8),inset 0 -1px 0 rgba(255,255,255,.04),0 1px 0 rgba(255,255,255,.06)}',
      K + '.vk-dagur.helgi{background:linear-gradient(180deg,#0f0e0d 0%,#080807 100%)}',
      K + '.vk-dagur.idag{border-color:rgba(226,196,111,.6);background:radial-gradient(ellipse 120% 70% at 50% 0%,rgba(255,200,90,.18) 0%,rgba(255,200,90,0) 70%),linear-gradient(180deg,#1a1814 0%,#0c0b0a 100%);box-shadow:inset 0 1px 0 rgba(255,236,180,.18),0 0 0 1px rgba(255,210,120,.22),0 0 26px -4px rgba(255,200,90,.42)}',
      K + '.vk-dh{display:flex;align-items:center;gap:6px;min-width:0}',
      K + '.vk-dn{font:700 10.5px ' + MONO + ';letter-spacing:.16em;color:#c9a54a}',
      K + '.vk-dagur.helgi .vk-dn{color:#8f8776}',
      K + '.vk-dd{font:800 22px/1 "Playfair Display",Georgia,serif;font-variant-numeric:lining-nums;color:#f4f1ea}',
      K + '.vk-idag{padding:2px 6px;border-radius:3px;background:linear-gradient(180deg,#f3dc95 0%,#c9a54a 55%,#a87b1f 100%);color:#161513;font:800 9.5px ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;box-shadow:0 0 10px rgba(255,200,90,.45)}',
      K + '.vk-bil{flex:1}',
      K + '.vk-plus{flex:none;width:24px;height:24px;padding:0;border-radius:5px;border:1px solid rgba(201,160,74,.35);background:rgba(201,160,74,.06);color:#e8cb7a;font:700 15px/1 ' + SANS + ';cursor:pointer}',
      K + '.vk-plus:hover{background:rgba(201,160,74,.16);box-shadow:0 0 10px rgba(255,200,90,.3)}',
      K + '.vk-verkin{display:flex;flex-direction:column;gap:6px;min-width:0}',
      K + '.vk-verk{display:flex;flex-direction:column;gap:1px;width:100%;min-width:0;padding:6px 8px 7px 9px;text-align:left;border-radius:4px;border:1px solid rgba(255,255,255,.07);border-left:3px solid var(--lit,#a89f8c);background:rgba(255,255,255,.035);color:#efe9da;font:inherit;cursor:pointer}',
      K + '.vk-verk:hover{border-color:rgba(226,196,111,.38);border-left-color:var(--lit,#a89f8c);background:rgba(255,210,120,.06)}',
      K + '.vk-timi{display:flex;gap:6px;align-items:baseline;font:600 10.5px ' + MONO + ';color:#e8cb7a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      K + '.vk-timi i{font-style:normal;color:#8f8776}',
      K + '.vk-nafn{font-size:12.5px;line-height:1.3;color:#f4f1ea;overflow-wrap:anywhere}',
      K + '.vk-ath{font-size:11px;line-height:1.3;color:#a89f8c;overflow-wrap:anywhere}',
      K + '.vk-autt{font:500 11px ' + MONO + ';color:#8f8776;letter-spacing:.04em}',
      K + '.vk-nota{margin-top:auto;padding:6px 7px;border-radius:4px;border:1px dashed rgba(201,160,74,.28);color:#c8c1b1;font-size:11.5px;line-height:1.35;white-space:pre-wrap;overflow-wrap:anywhere}',
      K + '.vk-skyring{display:flex;flex-wrap:wrap;gap:6px 16px;font:500 11px ' + MONO + ';color:#8f8776}',
      K + '.vk-skyring span{display:inline-flex;align-items:center;gap:6px}' + K + '.vk-skyring i{width:8px;height:8px;border-radius:50%;display:inline-block}',
      '@media (max-width:1100px){' + K + '.vk-vika{grid-template-columns:repeat(4,minmax(0,1fr))}}',
      '@media (max-width:760px){' + K + '.vk-vika{display:flex;flex-direction:column;gap:6px}' + K + '.vk-dagur{min-height:0;gap:6px}' + K + '.vk-buk{padding:10px}' + K + '.sam-haus .sam-plata{order:3}}',
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
    if (_dag && _vik && _sec && _dag.parentNode === hylki && _dag.previousElementSibling === kvedja && _vik.previousElementSibling === _dag && _sec.previousElementSibling === _vik) return true;
    if (!_dag) {
      _dag = document.createElement('section');
      _dag.className = '_sam420 _dag420';
      _dag.setAttribute('aria-label', 'Dagurinn');
      _dag.addEventListener('click', (e) => {
        const f = e.target.closest('[data-fara]'); if (f) { fara(f.dataset.fara); return; }
        if (e.target.closest('[data-dag="hreinsa"]')) { hreinsa(); return; }
        const af = e.target.closest('[data-dag="aftur"]'); if (af) { afturkalla(+af.dataset.id); return; }
        if (e.target.closest('[data-dag="endurnyja"]')) { D.lesid = false; teiknaDag(); lesaDaginn(); lesaStodu(); }
      });
      teiknaDag();
    }
    if (!_vik) {
      _vik = document.createElement('section');
      _vik.className = '_sam420 _vik420';
      _vik.setAttribute('aria-label', 'Vikan');
      _vik.addEventListener('click', vikaSmellur);
      teiknaViku();
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
    _dag.insertAdjacentElement('afterend', _vik);
    _vik.insertAdjacentElement('afterend', _sec);
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
        if (setjaInn() && Date.now() - _sidastLesid > 30000) { _sidastLesid = Date.now(); lesaStodu(); lesaDaginn(); teiknaViku(); }
      });
      _vakt.observe(v, { childList: true, subtree: true });
    }
    if (v.classList.contains('active') && setjaInn() && Date.now() - _sidastLesid > 30000) { _sidastLesid = Date.now(); lesaStodu(); lesaDaginn(); teiknaViku(); }
    return true;
  }
  let _tilraunir = 0;
  (function start() { if (!vakta() && ++_tilraunir < 60) setTimeout(start, 500); })();
  // Sýnin er virkjuð með klasa (61 patchSwitch) — lesa stöðuna upp á nýtt þegar hún opnast, mest á 30 sek fresti.
  document.addEventListener('view-shown', (e) => { if (e && e.detail && e.detail.name === 'stjornstod') setTimeout(vakta, 0); });

  window.Samstilling = { keyra, keyraAllt, lesaStodu, version: 'v1' };
})();
/* === END STJÓRNSTÖÐ — SAMSTILLING GAGNA === */
