/* === VINNUSAMANTEKT (489) — 29.10.2026 ==========================================================
 *
 * Agnar 29.10.2026: „Hve margar villur … hvað er ógreitt … hve mörg ný fyrirtæki … hve margar úttektir eftir …" —
 * og um útlitið: „Ég held bara á þjónustuborðinu. Bara hjá Agnari eins og er. Nokkuð áberandi með þó nokkur ljósa
 * indicators eftir alvarleika" · „Helst að allt linkist á viðeigandi staði til að vinna hlutina á. Að ég geti breytt
 * öllu. Hent út. Bætt við texta á litlar punktalínur".
 *
 * HVAÐ ÞETTA ER: ein samantekt efst á Þjónustuborði (368) — lína á hvert atriði sem Agnar þarf að vita, með ljósi eftir
 * alvarleika (rautt · gult · grænt · stál = upplýsing · grátt = ekki mælt). Allt er talið upp á nýtt úr gagnagrunninum
 * þegar borðið opnast (skyndiminni 5 mín.; ↻ sækir aftur). Þessi skrá á GÖGNIN, reglurnar um alvarleika og teikninguna;
 * 368 á aðeins innsetninguna (vsHtml), smellina (vs-*) og Fela/Skýring-kerfið sem hér er endurnýtt.
 *
 * ALLT LINKAST: hver lína opnar staðinn þar sem hluturinn er unninn — ham á borðinu (data-t5="mode"), síðu í appinu
 * (App.switchView) eða Brunahólf (nýr flipi). Tenglarnir eru í MAEL[].slod og auðvelt að breyta.
 *
 * HENDA ÚT OG BÆTA VIÐ TEXTA: sama kerfi og annað á borðinu — „Fela" og „Skýring" á hverri línu, geymt í
 * thjonustubord_falid undir lyklinum yfirlit:mael:<id>, samstillt á allar vélar, aldrei eytt („N falin · Sýna").
 * Skýringin birtist sem lítil punktalína undir línunni; hver lína í henni verður eigin punktur.
 *
 * ALVARLEIKI — reglurnar eru hér, ekki dreifðar: sjá `sev` í hverri mælingu. Þröskuldarnir eru viljandi grófir og
 * standa í þröskuldum efst (THR) svo hægt sé að stilla þá án þess að leita.
 *
 * ÓMÆLT ER EKKI SAMA OG Í LAGI: mælist atriði ekki (villa, vantar tengingu) fær það grátt ljós og villuna sem texta —
 * aldrei grænt. Ein mæling sem bilar fellir ekki hinar.
 * ========================================================================================== */
(() => {
  if (window.__vinnusamantekt489) return;
  window.__vinnusamantekt489 = true;

  const EIGANDI = 'Agnar';                               // sést aðeins þar til fleiri fá hana
  const BH = 'https://brunaholf.netlify.app';
  const SKYNDI = 5 * 60 * 1000;
  const HOLF = ['eldklar@eldklar.is', 'bokhald@eldklar.is'];
  const FELLT_LYKILL = 'vinnusamantekt.fellt';
  // Þröskuldar alvarleika — stilla hér.
  const THR = {
    krofuAldurAthuga: 45, krofuAldurAlv: 90,            // dagar frá stofnun ógreiddrar sendrar kröfu
    osentAldurAlv: 30,                                   // ósend krafa eldri en þetta = rautt
    postAthuga: 10, postAlv: 30, postAldurAthuga: 2, postAldurAlv: 5,
    samtAthuga: 20, samtAlv: 150, claudeAldurAthuga: 5, claudeAldurAlv: 14,
    utrunnidAlv: 30, skyrslurAthuga: 20, tekjurAthuga: 0.8, tekjurAlv: 0.6,
    osentBhAlv: 5e6, nyjarVillurAlv: 5,
    artifactAldurAthuga: 30                              // dagar — listi í artifact eldri en þetta telst líklega úreltur
  };

  const sb = () => (window.DB && DB.sb) || null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const tal = n => Math.round(Number(n) || 0).toLocaleString('is-IS').replace(/,/g, '.');
  const kr = n => (n < 0 ? '−' : '') + tal(Math.abs(n)) + ' kr';
  const mkr = n => Math.abs(n) >= 1e6 ? (n < 0 ? '−' : '') + (Math.abs(n) / 1e6).toFixed(1).replace('.', ',') + ' m.kr' : kr(n);
  const dags = d => { d = new Date(d); return isNaN(d.getTime()) ? '' : pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); };
  const klst = d => pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
  const dagarSidan = iso => Math.floor((Date.now() - Date.parse(iso)) / 864e5);
  const pst = (a, b) => (b ? (a >= b ? '+' : '−') + (Math.abs(a - b) / b * 100).toFixed(1).replace('.', ',') + ' %' : '');
  // Allt í UTC: Ísland er á UTC allt árið, og skil mánaða og vikna mega ekki færast eftir tímabelti tölvunnar sem opnar borðið.
  const manudur = (af = 0) => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + af, 1)); };
  const vika = (af = 0) => { const d = new Date(), x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7) + af * 7); return x; };
  const isoDags = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  // Anon-lykillinn fær TÓMT svar (ekki villu) úr RLS-varinni töflu — tómt svar úr töflu sem á aldrei að vera tóm er mæling sem mistókst, ekki núll.
  const kraefst = (l, tafla) => { if (!l || !l.length) throw new Error('engar raðir lesnar úr ' + tafla + ' — vantar líklega aðgang'); return l; };
  const synt = (a, v) => ({ sev: 'upp', tala: a, undir: v || '', punktar: [] });

  const S = { res: null, at: null, loading: false, villa: null, fellt: null, bara: null, opna: {} };
  const notify = () => { try { if (window.Bord368 && Bord368.render) Bord368.render(); } catch (_) {} };

  const bhGet = async slod => {
    const r = await fetch(BH + slod, { cache: 'no-store' });
    if (!r.ok) throw new Error(slod + ' svaraði ' + r.status);
    return r.json();
  };
  const fyrirspurn = async p => { const r = await p; if (r.error) throw r.error; return r.data || []; };
  const telja = async p => { const r = await p; if (r.error) throw r.error; return r.count || 0; };
  // PostgREST sker allt í 1000 röðum án viðvörunar (vörðurinn audit-pagination) — fyrirspurnir sem geta farið yfir 1000 raðir fara um DB.fetchAll
  // með einkvæmri röðun og .range(), eins og aðrir patchar.

  /* ── sameiginleg gögn: sótt einu sinni í hverri hleðslu og deilt milli mælinga ───────────────── */
  async function saekjaGogn(c) {
    const g = {};
    const verk = {
      solur: () => DB.fetchAll((a, b) => c.from('solur').select('id,samtals,created_at,paid_at,krafa_sent_at,dk_invoice_id,vidskiptategund,status,is_credit,hidden,greitt_med,linur')
        .gte('created_at', manudur(-1).toISOString()).neq('status', 'void').order('id').range(a, b)),
      opnarKrofur: () => DB.fetchAll((a, b) => c.from('solur').select('id,samtals,created_at,krafa_sent_at,dk_invoice_id,status,is_credit,hidden')
        .eq('greitt_med', 'reikningur').is('paid_at', null).neq('status', 'void').order('id').range(a, b)),
      greitt: () => DB.fetchAll((a, b) => c.from('solur').select('samtals,paid_at,is_credit,status,greitt_med').gte('paid_at', vika(-1).toISOString()).order('id').range(a, b)),
      bhGreitt: () => bhGet('/api/krofu-greidslur?n=20'),
      slokkvitaekiVorur: () => fyrirspurn(c.from('vorur').select('id').eq('flokkur', 'Slökkvitæki')),
      plan: () => DB.fetchAll((a, b) => c.from('v_uttektarplan').select('man,stada').order('fid').order('man').range(a, b)),
      postur: () => saekjaPost(c),
      bord: () => telja(c.from('thjonustubeidni').select('id', { count: 'exact', head: true }).is('deleted_at', null).is('archived_at', null).or('status.is.null,status.neq.lokad')),
      villur: () => bhGet('/api/villur?dagar=14&allt=1&limit=200'),   // villur er RLS-varin án anon-reglna — aðeins þetta fall les hana
      nyFyrirtaeki: () => fyrirspurn(c.from('fyrirtaeki').select('id,er_i_thjonustu').gte('created_at', manudur().toISOString()).is('deleted_at', null).limit(1000)),
      bunadargr: async () => {
        const [n, m, v] = await Promise.all([
          telja(c.from('bunadargreining').select('id', { count: 'exact', head: true }).is('fjarlaegt_at', null)),
          telja(c.from('bunadargreining').select('id', { count: 'exact', head: true }).is('fjarlaegt_at', null).not('skyrsla', 'is', null)),
          fyrirspurn(c.from('bunadargreining_verk').select('status').limit(1000))
        ]);
        return { n, medSkyrslu: m, verk: v };
      },
      redder: () => fyrirspurn(c.from('redder_invoices').select('dagsetning,m_vsk').gte('dagsetning', isoDags(vika(-1))).limit(500)),
      nyirStadir: () => bhGet('/api/worksites?year=2026'),
      kyb: () => bhGet('/api/krofu-yfirlit-bru'),
      fjarmal: () => bhGet('/api/fjarmal-yfirlit'),
      nlsh: () => bhGet('/api/nlsh-dashboard'),
      heilsa: () => bhGet('/api/kerfisheilsa'),
      veidin: () => bhGet('/api/veidin?tolur=1'),
      verkefni: () => DB.fetchAll((a, b) => c.from('verkefnalisti').select('status,assigned_agent,flag,priority').order('id').range(a, b)),
      artifactListar: () => fyrirspurn(c.from('artifact_listar').select('url,titill,tegund,dags,fjoldi_opin,fjoldi_claude,fjoldi_agnar,athugasemd,skrad_at').limit(100))
    };
    await Promise.all(Object.keys(verk).map(async k => {
      try { g[k] = { ok: true, v: await verk[k]() }; } catch (e) { g[k] = { ok: false, villa: (e && (e.message || e.details)) || String(e) }; }
    }));
    return g;
  }

  // Póstur: bréf í tveimur hólfum frá síðustu viku og áfram; svarað = útsendur póstur í sama Gmail-þræði á eftir.
  async function saekjaPost(c) {
    const inn = await fyrirspurn(c.from('email_digest').select('id,message_id,thread_id,received_at,is_question')
      .in('account', HOLF).eq('folder', 'INBOX').gte('received_at', vika(-1).toISOString()).limit(1000));
    const thraedir = [...new Set(inn.map(m => m.thread_id).filter(Boolean))];
    const sent = new Map();
    for (let i = 0; i < thraedir.length; i += 100) {
      const s = await fyrirspurn(c.from('email_digest').select('thread_id,received_at').eq('folder', 'SENT').in('thread_id', thraedir.slice(i, i + 100)));
      s.forEach(x => { const f = sent.get(x.thread_id); if (!f || Date.parse(x.received_at) > Date.parse(f)) sent.set(x.thread_id, x.received_at); });
    }
    const ids = inn.map(m => m.message_id).filter(Boolean), afgreitt = new Set();
    for (let i = 0; i < ids.length; i += 100) {
      const [h, a] = await Promise.all([
        fyrirspurn(c.from('reikninga_postur_hidden').select('message_id').in('message_id', ids.slice(i, i + 100))),
        fyrirspurn(c.from('reikninga_postur_activity').select('message_id').in('message_id', ids.slice(i, i + 100)))
      ]);
      h.concat(a).forEach(x => afgreitt.add(x.message_id));
    }
    return inn.map(m => Object.assign({}, m, {
      svarad: !!(m.thread_id && sent.get(m.thread_id) && Date.parse(sent.get(m.thread_id)) > Date.parse(m.received_at)) || afgreitt.has(m.message_id)
    }));
  }

  /* ── mælingarnar — hver skilar { sev, tala, undir, punktar[] } ────────────────────────────── */
  const erKredit = r => r.is_credit === true;
  const lokid = r => r.status === 'final' && !erKredit(r);
  function tekjurManadar(rows) {
    const mb = manudur().getTime(), r = { nu: { all: 0, uttekt: 0, bud: 0, annad: 0, n: 0, nu: 0, nb: 0 }, fyrri: { all: 0, uttekt: 0, bud: 0, annad: 0, n: 0, nu: 0, nb: 0 } };
    rows.filter(lokid).forEach(x => {
      const m = Date.parse(x.created_at) >= mb ? r.nu : r.fyrri, k = x.vidskiptategund === 'uttekt' ? 'uttekt' : x.vidskiptategund === 'bud' ? 'bud' : 'annad', v = Number(x.samtals) || 0;
      m.all += v; m[k] += v; m.n++; if (k === 'uttekt') m.nu++; if (k === 'bud') m.nb++;
    });
    return r;
  }
  function taekiManadar(rows, vorur) {
    const mb = manudur().getTime(), sl = new Set(vorur.map(x => String(x.id)));
    const t = { nu: { nytt: 0, hladid: 0, yfirfarid: 0 }, fyrri: { nytt: 0, hladid: 0, yfirfarid: 0 } };
    rows.filter(r => !erKredit(r)).forEach(x => {
      const m = Date.parse(x.created_at) >= mb ? t.nu : t.fyrri;
      (Array.isArray(x.linur) ? x.linur : []).forEach(l => {
        const d = String(l.desc || l.l || ''), q = Number(l.qty != null ? l.qty : l.n) || 0, pid = l.product_id != null ? String(l.product_id) : '';
        if (/reykskynj|brunaslang|slöngu/i.test(d)) return;
        if (!/(duft|léttvatn|co2|co₂|froð|abf|abc|kolsýru|slökkvitæki)/i.test(d) && !sl.has(pid)) return;
        if (/^nýtt/i.test(d) || sl.has(pid)) m.nytt += q;
        else if (/(hleðsla|helðsla|hledsla|áfylling)/i.test(d)) m.hladid += q;
        else if (/yfirfer/i.test(d)) m.yfirfarid += q;
      });
    });
    return t;
  }
  const hluti = () => { const n = new Date(); return (n.getUTCDate() - 1 + 0.5) / new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 0)).getUTCDate(); };   // hlutfall mánaðar liðið

  const MAEL = [
    /* ── Peningar ── */
    { id: 'tekjur', hopur: 'Peningar', heiti: 'Tekjur · mánuður á móti síðasta', slod: { view: 'income', t: 'Tekjur' }, maela: g => {
      const t = tekjurManadar(kraefst(g.solur.v, 'solur')), n = t.nu, f = t.fyrri, dagur = new Date().getUTCDate();
      const spa = n.all / hluti(), hlutf = f.all ? spa / f.all : 1;
      const sev = dagur < 8 ? 'upp' : hlutf < THR.tekjurAlv ? 'alv' : hlutf < THR.tekjurAthuga ? 'athuga' : 'ok';
      return { sev, tala: mkr(n.all), undir: pst(n.all, f.all) + ' frá síðasta mánuði (' + mkr(f.all) + ')', punktar: [
        'úttektir ' + mkr(n.uttekt) + ' · ' + n.nu + ' reikningar (síðast ' + mkr(f.uttekt) + ')',
        'búð ' + mkr(n.bud) + ' · ' + n.nb + ' reikningar (síðast ' + mkr(f.bud) + ')',
        'annað ' + mkr(n.annad) + ' (síðast ' + mkr(f.annad) + ')',
        'sala með vsk, ekki greiðslur · drög ekki talin'] };
    } },
    { id: 'greitt', hopur: 'Peningar', heiti: 'Greitt til okkar í vikunni', slod: { ham: 'krofur', t: 'Kröfur' }, maela: g => {
      const v0 = vika().getTime(), v1 = vika(-1).getTime();
      const sl = g.greitt.v.filter(r => r.greitt_med === 'reikningur' && r.status !== 'void' && !erKredit(r) && r.paid_at);
      const nu = sl.filter(r => Date.parse(r.paid_at) >= v0), fy = sl.filter(r => Date.parse(r.paid_at) >= v1 && Date.parse(r.paid_at) < v0);
      const s = a => a.reduce((x, r) => x + (Number(r.samtals) || 0), 0);
      let bn = [], bf = [], bhNota = '';
      if (g.bhGreitt.ok) {
        // /api/krofu-greidslur: síðustu 20 greiðslur sem Payday skráir (invoices er RLS-varin fyrir anon-lykilinn).
        const pd = (g.bhGreitt.v.rows || []).filter(r => r.greidsla_date);
        bn = pd.filter(r => r.greidsla_date >= isoDags(vika())); bf = pd.filter(r => r.greidsla_date >= isoDags(vika(-1)) && r.greidsla_date < isoDags(vika()));
      } else bhNota = 'Brunahólf ekki talið (' + g.bhGreitt.villa + ')';
      const b = a => a.reduce((x, r) => x + (Number(r.upphaed_total) || 0), 0);
      const nuS = s(nu) + b(bn), fyS = s(fy) + b(bf);
      return { sev: 'upp', tala: mkr(nuS), undir: nu.length + bn.length + ' greiðslur · síðasta vika ' + mkr(fyS), punktar: [
        'Slökkvitæki ' + mkr(s(nu)) + ' · ' + nu.length + ' (síðast ' + mkr(s(fy)) + ' · ' + fy.length + ')',
        'Brunahólf ' + mkr(b(bn)) + ' · ' + bn.length + ' (síðast ' + mkr(b(bf)) + ' · ' + bf.length + ')'].concat(bhNota ? [bhNota] : []) };
    } },
    { id: 'osend_sl', hopur: 'Peningar', heiti: 'Ósendar kröfur · Slökkvitæki', slod: { ham: 'krofur', t: 'Kröfur' }, maela: g => {
      const l = g.opnarKrofur.v.filter(r => lokid(r) && !r.hidden && !r.dk_invoice_id && !r.krafa_sent_at);
      const s = l.reduce((a, r) => a + (Number(r.samtals) || 0), 0), elst = l.reduce((a, r) => Math.max(a, dagarSidan(r.created_at)), 0);
      const kred = g.opnarKrofur.v.filter(r => erKredit(r) && !r.hidden && !r.dk_invoice_id);
      return { sev: !l.length ? 'ok' : elst > THR.osentAldurAlv ? 'alv' : 'athuga', tala: l.length + ' · ' + mkr(s), undir: l.length ? 'elsta ' + elst + ' d. gömul' : 'ekkert bíður sendingar',
        punktar: kred.length ? [kred.length + ' ósend kreditskjöl · ' + mkr(kred.reduce((a, r) => a + (Number(r.samtals) || 0), 0)) + ' (ekki í Payday)'] : [] };
    } },
    { id: 'ogr_sl', hopur: 'Peningar', heiti: 'Ógreiddar sendar kröfur · Slökkvitæki', slod: { ham: 'krofur', t: 'Kröfur' }, maela: g => {
      const l = g.opnarKrofur.v.filter(r => lokid(r) && !r.hidden && (r.dk_invoice_id || r.krafa_sent_at));
      const s = l.reduce((a, r) => a + (Number(r.samtals) || 0), 0), elst = l.reduce((a, r) => Math.max(a, dagarSidan(r.created_at)), 0);
      const gamlar = l.filter(r => dagarSidan(r.created_at) > THR.krofuAldurAthuga);
      return { sev: elst > THR.krofuAldurAlv ? 'alv' : elst > THR.krofuAldurAthuga ? 'athuga' : l.length ? 'ok' : 'ok', tala: l.length + ' · ' + mkr(s), undir: 'elsta ' + elst + ' d. gömul',
        punktar: [gamlar.length + ' eldri en ' + THR.krofuAldurAthuga + ' daga · ' + mkr(gamlar.reduce((a, r) => a + (Number(r.samtals) || 0), 0))] };
    } },
    { id: 'osend_bh', hopur: 'Peningar', heiti: 'Ósendar kröfur · Brunahólf', slod: { url: BH + '/fjarmalyfirlit.html', t: 'Fjármála-yfirlit' }, maela: g => {
      const t = g.kyb.v.tier2 || {}, n = t.n || 0, s = t.total || 0;
      const faldar = (g.kyb.v.tier2.debtors || []).reduce((a, d) => a + (d.invoices || []).filter(i => i.hidden).length, 0);
      return { sev: !n ? 'ok' : s > THR.osentBhAlv ? 'alv' : 'athuga', tala: n + ' · ' + mkr(s), undir: 'drög og Payday-drög úr Kröfu yfirliti',
        punktar: faldar ? [faldar + ' faldar raðir í Kröfu yfirliti eru ekki taldar — á eftir að yfirfara'] : [] };
    } },
    { id: 'ogr_bh', hopur: 'Peningar', heiti: 'Ógreitt · Brunahólf (Payday)', slod: { url: BH + '/fjarmalyfirlit.html', t: 'Fjármála-yfirlit' }, maela: g => {
      const t = g.kyb.v.tier1 || {};
      return { sev: (t.n || 0) ? 'athuga' : 'ok', tala: (t.n || 0) + ' · ' + mkr(t.total || 0), undir: 'reikningar í Payday og kröfur í banka', punktar: [] };
    } },
    /* ── Vinna ── */
    { id: 'uttektir', hopur: 'Vinna', heiti: 'Úttektir í mánuðinum', slod: { view: 'companies', t: 'Fyrirtæki og Ársskoðun' }, maela: g => {
      const man = new Date().getUTCMonth() + 1, l = kraefst(g.plan.v, 'v_uttektarplan').filter(r => r.man === man);
      const buid = l.filter(r => r.stada === 'merkt_buid').length, eftir = l.filter(r => r.stada === 'thessi_manudur').length, alls = buid + eftir;
      const dagarEftir = new Date(Date.UTC(new Date().getUTCFullYear(), man, 0)).getUTCDate() - new Date().getUTCDate();
      const sev = !eftir ? 'ok' : dagarEftir <= 3 ? 'alv' : (alls && buid / alls < hluti() - 0.15) ? 'athuga' : 'ok';
      return { sev, tala: eftir + ' eftir', undir: buid + ' af ' + alls + ' búnar · ' + dagarEftir + ' dagar eftir af mánuðinum', punktar: [] };
    } },
    { id: 'utrunnid', hopur: 'Vinna', heiti: 'Úttektir útrunnar úr fyrri mánuðum', slod: { view: 'companies', t: 'Fyrirtæki og Ársskoðun' }, maela: g => {
      const n = kraefst(g.plan.v, 'v_uttektarplan').filter(r => r.stada === 'utrunnid').length;
      return { sev: n > THR.utrunnidAlv ? 'alv' : n ? 'athuga' : 'ok', tala: String(n), undir: 'í plani en ekki merktar búnar', punktar: [] };
    } },
    { id: 'skyrslur', hopur: 'Vinna', heiti: 'Skýrslur í vinnslu', slod: { ham: 'skyrslur', t: 'Skýrslur' }, maela: g => {
      const t = g.fjarmal.v.skyrslur_i_vinnslu || {};
      return { sev: (t.n || 0) > THR.skyrslurAthuga ? 'athuga' : 'upp', tala: (t.n || 0) + ' · ' + mkr(t.kr || 0), undir: 'úr Fjármála-yfirliti', punktar: [] };
    } },
    { id: 'taeki', hopur: 'Vinna', heiti: 'Tæki · ný, hlaðin, yfirfarin', slod: { view: 'income', t: 'Tekjur' }, maela: g => {
      const t = taekiManadar(kraefst(g.solur.v, 'solur'), g.slokkvitaekiVorur.ok ? g.slokkvitaekiVorur.v : []), n = t.nu, f = t.fyrri;
      return { sev: 'upp', tala: n.nytt + ' ný · ' + n.hladid + ' hlaðin · ' + n.yfirfarid + ' yfirfarin', undir: 'síðasta mánuði ' + f.nytt + ' · ' + f.hladid + ' · ' + f.yfirfarid,
        punktar: ['slökkvitæki eingöngu · flokkað eftir texta á línum reikninga', 'ný ' + pst(n.nytt, f.nytt) + ' · hlaðin ' + pst(n.hladid, f.hladid) + ' · yfirfarin ' + pst(n.yfirfarid, f.yfirfarid)] };
    } },
    { id: 'timavinna', hopur: 'Vinna', heiti: 'Verðmæti tímavinnu · Brunahólf', slod: { url: BH + '/fjarmalyfirlit.html', t: 'Fjármála-yfirlit' }, maela: g => {
      const t = g.fjarmal.v.timavera_manudur || {}, top = (t.list || []).slice(0, 3);
      return { sev: 'upp', tala: mkr(t.kr || 0), undir: tal(t.klst || 0) + ' klst í mánuðinum (taxti ' + tal(g.fjarmal.v.taxti_mvsk) + ' kr/klst)', punktar: top.map(x => x.label + ' ' + mkr(x.kr)) };
    } },
    { id: 'ajour', hopur: 'Vinna', heiti: 'Ajour · Landspítali uppsafnað í mánuðinum', slod: { url: BH + '/nlsh.html', t: 'NLSH-mælaborð' }, maela: g => {
      const m = g.nlsh.v.byMonth || [], a = m[m.length - 1] || {}, b = m[m.length - 2] || {};
      return { sev: 'upp', tala: mkr(a.revenue_m_vsk || 0), undir: (a.holes || 0) + ' göt · ' + tal(a.hours || 0) + ' klst · síðast ' + mkr(b.revenue_m_vsk || 0),
        punktar: ['áætlun úr Ajour og Tímaveru, ekki reikningur · alls ' + mkr((g.nlsh.v.totals || {}).revenue_m_vsk || 0)] };
    } },
    { id: 'redder', hopur: 'Vinna', heiti: 'Redder-reikningar í vikunni', slod: { url: BH + '/', t: 'Brunahólf · Efniskostnaður' }, maela: g => {
      const v0 = isoDags(vika()), l = g.redder.v, nu = l.filter(r => r.dagsetning >= v0), fy = l.filter(r => r.dagsetning < v0);
      return { sev: 'upp', tala: String(nu.length), undir: 'síðasta vika ' + fy.length + (fy.length ? ' · ' + mkr(fy.reduce((a, r) => a + (Number(r.m_vsk) || 0), 0)) : ''), punktar: [] };
    } },
    /* ── Fólk og póstur ── */
    { id: 'postur', hopur: 'Fólk og póstur', heiti: 'Ósvaraður póstur', slod: { ham: 'tolvupostar', t: 'Tölvupóstar' }, maela: g => {
      const v0 = vika().getTime(), l = g.postur.v.filter(m => !m.svarad), nu = l.filter(m => Date.parse(m.received_at) >= v0), fy = l.filter(m => Date.parse(m.received_at) < v0);
      const bar = g.postur.v.filter(m => Date.parse(m.received_at) >= v0).length, barFy = g.postur.v.filter(m => Date.parse(m.received_at) < v0).length;
      const elst = nu.concat(fy).reduce((a, m) => Math.max(a, dagarSidan(m.received_at)), 0);
      const sev = nu.length >= THR.postAlv || elst > THR.postAldurAlv ? 'alv' : nu.length >= THR.postAthuga || elst > THR.postAldurAthuga ? 'athuga' : 'ok';
      return { sev, tala: nu.length + ' þessa viku', undir: 'af ' + bar + ' sem bárust · síðasta vika ' + fy.length + ' af ' + barFy,
        punktar: [nu.filter(m => m.is_question).length + ' spurningar í vikunni · elsti ósvaraði ' + elst + ' d.', 'eldklar@ og bokhald@ · sjálfvirkur póstur er með'] };
    } },
    { id: 'samthykki', hopur: 'Fólk og póstur', heiti: 'Bíður samþykkis hjá þér', slod: { ham: 'samthykkja', t: 'Samþykkja' }, live: () => {
      const s = samt(); if (!s) return null;
      const n = s.tilbuid + s.spurn;
      return { sev: n >= THR.samtAlv ? 'alv' : n >= THR.samtAthuga ? 'athuga' : 'ok', tala: String(n), undir: s.tilbuid + ' tilbúin · ' + s.spurn + ' spurningar', punktar: [] };
    } },
    { id: 'claude', hopur: 'Fólk og póstur', heiti: 'Hjá Claude eftir samþykki', slod: { ham: 'samthykkja', t: 'Samþykkja' }, live: () => {
      const s = samt(); if (!s) return null;
      return { sev: s.claude && s.eldst > THR.claudeAldurAlv ? 'alv' : s.claude && s.eldst > THR.claudeAldurAthuga ? 'athuga' : 'ok', tala: String(s.claude), undir: s.claude ? 'elsta ' + s.eldst + ' d. gamalt' : 'ekkert bíður', punktar: [] };
    } },
    { id: 'bord', hopur: 'Fólk og póstur', heiti: 'Mál á borðinu', slod: { ham: 'thjonusta', t: 'Master og mitt borð' }, maela: g => synt(String(g.bord.v), 'ekki eytt, ekki í geymslu, ekki lokað') },
    /* ── Fyrirtæki ── */
    { id: 'nyfyrirtaeki', hopur: 'Fyrirtæki', heiti: 'Ný fyrirtæki í þjónustu í mánuðinum', slod: { view: 'companies', t: 'Fyrirtæki' }, maela: async (g, c) => {
      const n = g.nyFyrirtaeki.v, ithj = n.filter(x => x.er_i_thjonustu), ids = ithj.map(x => x.id);
      let heimsaekja = ids.length, punktur = '';
      if (ids.length) {
        const pl = await fyrirspurn(c.from('v_uttektarplan').select('fid,stada').in('fid', ids));
        const buin = new Set(pl.filter(r => r.stada === 'merkt_buid' || r.stada === 'tekid_ut').map(r => r.fid));
        heimsaekja = ids.filter(i => !buin.has(i)).length;
        punktur = heimsaekja + ' af ' + ids.length + ' sem eru í þjónustu eiga eftir að fá heimsókn (ekki merkt búin í plani)';
      }
      // 31.10.2026 (Agnar: „Ný fyrirtæki, eiga bara telja ný í þjónustu"): talan taldi ÖLL ný
      // félög mánaðarins — líka þau sem eru bara stofnuð í skrána (lausasala, kt-uppfletting)
      // og verða aldrei í þjónustu. Það var helmingur í október (42 → 21). Talan telur nú
      // aðeins þau sem eru í þjónustu; hin eru nefnd í undirlínunni svo sían sjáist, ekki feld.
      const utan = n.length - ithj.length;
      return { sev: heimsaekja ? 'athuga' : 'upp', tala: ithj.length + ' ný', undir: heimsaekja + ' á eftir að heimsækja' + (utan ? ' · ' + utan + ' ný utan þjónustu ekki talin' : ''), punktar: punktur ? [punktur] : [] };
    } },
    { id: 'bunadargr', hopur: 'Fyrirtæki', heiti: 'Búnaðargreiningar', slod: { view: 'companies', t: 'Fyrirtæki' }, maela: g => {
      const b = g.bunadargr.v, st = x => b.verk.filter(r => r.status === x).length;
      return { sev: st('villa') ? 'athuga' : 'upp', tala: b.n + ' til', undir: b.medSkyrslu + ' með skýrslu · verk: ' + st('lokid') + ' lokið · ' + st('villa') + ' með villu · ' + st('afturkallad') + ' afturkölluð', punktar: [] };
    } },
    { id: 'nyirstadir', hopur: 'Fyrirtæki', heiti: 'Nýir verkstaðir í Tímaveru', slod: { url: BH + '/', t: 'Brunahólf · Verkstaðir' }, maela: g => {
      // Nýr = fyrsta færsla í Tímaveru síðustu 14 daga. Ótengdur = enginn kúnni skráður á verkstaðinn (mapped_customers).
      const fra = isoDags(new Date(Date.now() - 14 * 864e5)), l = (g.nyirStadir.v.worksites || []).filter(w => w.first >= fra);
      const otengdir = l.filter(w => !w.mapped_customers || !w.mapped_customers.length);
      return { sev: otengdir.length ? 'athuga' : 'ok', tala: String(l.length), undir: otengdir.length ? otengdir.length + ' án kúnna tengdan · fyrsta færsla síðustu 14 daga' : 'allir tengdir kúnna',
        punktar: l.slice(0, 5).map(w => w.project + ' · ' + tal(w.hours) + ' klst · fyrst ' + dags(w.first) + ((w.mapped_customers || []).length ? '' : ' · án kúnna')) };
    } },
    /* ── Hunt og verkefni — „Veiðin" úr Jarvis (grunnlína 30/07/2026) og stóri verkefnalistinn ── */
    { id: 'hunt_skyrslur', hopur: 'Hunt og verkefni', heiti: 'Hunt · staðir með 2026-skýrslu', slod: { url: BH + '/veidin.html', t: 'Veiðin' }, maela: g => {
      const n = g.veidin.v.nuna || {}, b = g.veidin.v.baseline || {}, d = (n.stadir_med_2026_skyrslu || 0) - (b.stadir_med_2026_skyrslu || 0);
      return { sev: 'upp', tala: (n.stadir_med_2026_skyrslu || 0) + ' af ' + (n.stadir_i_thjonustu || 0), undir: (d >= 0 ? '+' : '−') + Math.abs(d) + ' frá grunnlínu ' + dags(b.dags), punktar: [
        (n.skyrslur_2026 || 0) + ' skýrslur 2026 · ' + (n.skyrslur_2026_reviewed || 0) + ' yfirfarnar (grunnlína ' + (b.skyrslur_2026_reviewed || 0) + ')'] };
    } },
    { id: 'hunt_engin', hopur: 'Hunt og verkefni', heiti: 'Hunt · staðir án skýrslu 2025–26', slod: { url: BH + '/veidin.html', t: 'Veiðin' }, maela: g => {
      const n = (g.veidin.v.nuna || {}).engin_skyrsla_25_26 || 0, b = (g.veidin.v.baseline || {}).engin_skyrsla_25_26 || 0;
      return { sev: n > b / 2 ? 'athuga' : n ? 'ok' : 'ok', tala: String(n), undir: 'grunnlína ' + b + ' · ' + (n - b >= 0 ? '+' : '−') + Math.abs(n - b), punktar: [] };
    } },
    { id: 'hunt_gleymd', hopur: 'Hunt og verkefni', heiti: 'Hunt · gleymd félög og rukkuð án skýrslu', slod: { url: BH + '/veidin.html', t: 'Veiðin' }, maela: g => {
      const n = g.veidin.v.nuna || {}, b = g.veidin.v.baseline || {}, vex = (n.gleymd_felog || 0) > (b.gleymd_felog || 0) || (n.rukkud_an_skyrslu || 0) > (b.rukkud_an_skyrslu || 0);
      return { sev: (n.gleymd_felog || 0) > 2 * (b.gleymd_felog || 1) ? 'alv' : vex ? 'athuga' : 'ok', tala: (n.gleymd_felog || 0) + ' · ' + (n.rukkud_an_skyrslu || 0),
        undir: 'gleymd félög · rukkuð án skýrslu — grunnlína ' + (b.gleymd_felog || 0) + ' · ' + (b.rukkud_an_skyrslu || 0), punktar: [(n.amber_felog || 0) + ' amber félög (grunnlína ' + (b.amber_felog || 0) + ')'] };
    } },
    { id: 'hunt_bundle', hopur: 'Hunt og verkefni', heiti: 'Hunt · búnt: reikning og skýrslu vantar', slod: { url: BH + '/veidin.html', t: 'Veiðin' }, maela: g => {
      const n = g.veidin.v.nuna || {}, b = g.veidin.v.baseline || {};
      return { sev: (n.bundle_skyrsla_vantar || 0) > (b.bundle_skyrsla_vantar || 0) ? 'athuga' : 'ok', tala: (n.bundle_reikn_vantar || 0) + ' · ' + (n.bundle_skyrsla_vantar || 0), undir: 'reikning vantar · skýrslu vantar — grunnlína ' + (b.bundle_reikn_vantar || 0) + ' · ' + (b.bundle_skyrsla_vantar || 0), punktar: [] };
    } },
    { id: 'hunt_listar', hopur: 'Hunt og verkefni', heiti: 'Hunt · listar til yfirferðar', slod: { url: BH + '/veidin.html', t: 'Veiðin' }, maela: g => {
      const n = g.veidin.v.nuna || {};
      return { sev: 'upp', tala: String((n.systkini_kt || 0) + (n.blob_graen_an_skyrslu || 0) + (n.hud_buid_vs_skyrsla || 0) + (n.drive_tvitok || 0) + (n.skjol_an_ars || 0)), undir: 'atriði í fimm listum á Jarvis', punktar: [
        'systkini-kt ' + (n.systkini_kt || 0) + ' · blob-græn án skýrslu ' + (n.blob_graen_an_skyrslu || 0) + ' · HUD búið án skýrslu ' + (n.hud_buid_vs_skyrsla || 0),
        'Drive-tvítök ' + (n.drive_tvitok || 0) + ' · skjöl án árs ' + (n.skjol_an_ars || 0)] };
    } },
    { id: 'verkefnalisti', hopur: 'Hunt og verkefni', heiti: 'Stóri verkefnalistinn', slod: { url: BH + '/verkefnalisti.html', t: 'Verkefnalisti' }, maela: g => {
      const l = kraefst(g.verkefni.v, 'verkefnalisti'), opin = l.filter(x => x.status === 'beidni' || x.status === 'i_yfirferd'), flag = opin.filter(x => x.flag && String(x.flag) !== 'false' && String(x.flag) !== '0');
      const per = {}; opin.forEach(x => { const a = x.assigned_agent || 'enginn'; per[a] = (per[a] || 0) + 1; });
      const st = k => l.filter(x => x.status === k).length;
      return { sev: flag.length ? 'athuga' : 'upp', tala: opin.length + ' opin', undir: st('beidni') + ' beiðnir · ' + st('i_yfirferd') + ' í yfirferð · ' + st('klarad') + ' klárað · ' + st('sleppt') + ' sleppt',
        punktar: [flag.length + ' opin með flaggi', Object.keys(per).sort((a, b) => per[b] - per[a]).slice(0, 4).map(k => k + ' ' + per[k]).join(' · ')] };
    } },
    // Verkefnalistar sem búa í claude.ai-artifacts. Artifacts eru kyrrstæð: Claude les þau og skrifar tölurnar í artifact_listar,
    // þær uppfærast ekki sjálfar — því ber hver listi dagsetningu sína og línan segir hvenær var síðast lesið.
    // 29.10.2026: listarnir 16 voru sameinaðir í EINN („Sameinaður verkefnalisti“, atriði sannreynd gegn gögnum); gömlu raðirnar
    // eru tegund „annad“ og teljast ekki. Kyrrstæðar skýrslur (tegund „skyrsla“) eru ekki taldar með: þær endurtaka Samþykkja
    // og stóra listann og myndu tvítelja.
    { id: 'artifact_listar', hopur: 'Hunt og verkefni', heiti: 'Sameinaður verkefnalisti (artifacts)', slod: { url: 'https://claude.ai/artifact/5BF2JMXa8uvjJwLW7t6R1y', t: 'Sameinaður verkefnalisti' }, maela: g => {
      const l = kraefst(g.artifactListar.v, 'artifact_listar'), lista = l.filter(x => x.tegund === 'verkefnalisti'), skyr = l.filter(x => x.tegund === 'skyrsla');
      const sum = (a, k) => a.reduce((s, x) => s + (Number(x[k]) || 0), 0), opin = x => Number(x.fjoldi_opin) || 0;
      const gamlir = lista.filter(x => x.dags && dagarSidan(x.dags) > THR.artifactAldurAthuga);
      const lesid = l.reduce((a, x) => (x.skrad_at && x.skrad_at > a ? x.skrad_at : a), '');
      const linur = lista.slice().sort((a, b) => opin(b) - opin(a)).reduce((acc, x) => {
        acc.push(x.titill + ' ' + opin(x) + ' opin' + (x.fjoldi_claude != null ? ' (Claude ' + x.fjoldi_claude + ' · Agnar ' + (x.fjoldi_agnar || 0) + ')' : '') + ' · ' + (x.dags ? dags(x.dags) : 'án dags.'));
        if (x.athugasemd) acc.push(x.athugasemd);
        return acc;
      }, []);
      return { sev: 'upp', tala: sum(lista, 'fjoldi_opin') + ' opin',
        undir: lista.length + (lista.length === 1 ? ' listi' : ' listar') + ' · Claude ' + sum(lista, 'fjoldi_claude') + ' · Agnar ' + sum(lista, 'fjoldi_agnar') + (gamlir.length ? ' · ' + sum(gamlir, 'fjoldi_opin') + ' í listum eldri en ' + THR.artifactAldurAthuga + ' d' : ''),
        punktar: linur.concat(skyr.length ? ['Kyrrstæðar skýrslur, ekki taldar með: ' + skyr.map(x => x.titill + ' ' + opin(x)).join(' · ')] : [], ['Lesið úr listanum ' + (lesid ? dags(lesid) : '—') + ' — tölurnar uppfærast ekki sjálfar']) };
    } },
    /* ── Kerfi ── */
    { id: 'tengingar', hopur: 'Kerfi', heiti: 'Tengingar í lagi', slod: { url: BH + '/kerfisheilsa.html', t: 'Kerfisheilsa' }, maela: g => {
      const c = g.heilsa.v.counts || {}, alls = Object.keys(c).reduce((a, k) => a + (Number(c[k]) || 0), 0), g1 = c.graent || 0, rautt = c.rautt || 0, gult = c.gult || 0, graat = c.graat || 0;
      return { sev: rautt ? 'alv' : gult ? 'athuga' : 'ok', tala: g1 + ' af ' + alls, undir: [rautt && rautt + ' rauðar', gult && gult + ' gul', graat && graat + ' gráar'].filter(Boolean).join(' · ') || 'allt grænt',
        punktar: (g.heilsa.v.services || []).filter(x => x.status !== 'graent').map(x => x.heiti + ' — ' + (x.detail || x.status)) };
    } },
    { id: 'villur', hopur: 'Kerfi', heiti: 'Villur í kerfinu í vikunni', slod: { url: BH + '/kerfisheilsa.html', t: 'Kerfisheilsa' }, maela: g => {
      // /api/villur (service role): villur er RLS-varin án anon-reglna og má ekki lesa gegnum anon-lykilinn.
      const v0 = vika().getTime(), l = g.villur.v.villur || [], nu = l.filter(x => Date.parse(x.sidast_at) >= v0), ny = nu.filter(x => Date.parse(x.fyrst_at) >= v0);
      return { sev: ny.length >= THR.nyjarVillurAlv ? 'alv' : (ny.length || nu.length) ? 'athuga' : 'ok', tala: nu.length + ' ólíkar', undir: ny.length + (ny.length === 1 ? ' ný' : ' nýjar') + ' · síðasta vika ' + (l.length - nu.length) + ' · óleystar alls ' + ((g.villur.v.counts || {}).opnar != null ? g.villur.v.counts.opnar : l.filter(x => !x.leyst_at).length),
        punktar: nu.slice(0, 4).map(x => x.skilabod + ' · ' + x.fjoldi + ' alls frá ' + dags(x.fyrst_at)).concat(['talan geymir heildarfjölda og síðasta dag, ekki fjölda í vikunni']) };
    } }
  ];

  // Lifandi talning úr Samþykkja-rýminu (368) — sama tala og á hamahnappinum, aldrei önnur.
  function samt() {
    const SA = window.Samthykkja;
    if (!SA || !SA.loaded || !SA.loaded()) return null;
    const t = { tilbuid: 0, spurn: 0, claude: 0, eldst: 0 };   // eldst = dagar frá svari Agnars (updated_at), ekki frá stofnun málsins
    try {
      SA.listi().forEach(r => { const h = SA.hluti(r); if (h === 0) t.tilbuid++; else if (h === 1) t.spurn++; else if (h === 2) { t.claude++; t.eldst = Math.max(t.eldst, dagarSidan(r.updated_at || r.created_at)); } });
    } catch (_) { return null; }
    return t;
  }

  /* ── hleðsla ─────────────────────────────────────────────────────────────────────── */
  async function load(neydd) {
    if (S.loading) return;
    if (!neydd && S.at && Date.now() - S.at < SKYNDI) return;
    const c = sb();
    if (!c) { S.villa = 'Engin tenging við gagnagrunn'; return; }
    S.loading = true; S.villa = null; notify();
    try {
      const g = await saekjaGogn(c), res = {};
      // Sókn sem mistókst skilar hlut þar sem .ok er false og .v kastar villunni — mæling sem þarf hana fær grátt ljós,
      // mæling sem getur verið án hennar (t.d. Brunahólfs-greiðslur) les .ok og heldur áfram.
      const gg = new Proxy(g, { get: (o, k) => { const x = o[k]; return (x && x.ok === false) ? { ok: false, villa: x.villa, get v() { throw new Error(k + ': ' + x.villa); } } : x; } });
      await Promise.all(MAEL.filter(m => m.maela).map(async m => {
        try { res[m.id] = await m.maela(gg, c); }
        catch (e) { res[m.id] = { sev: 'oma', tala: '—', undir: 'Náði ekki að mæla: ' + ((e && (e.message || e.details)) || e), punktar: [] }; }
      }));
      S.res = res;
    } catch (e) { S.villa = (e && e.message) || String(e); }
    // S.at er líka sett þegar sókn bilar: annars kallaði hver teikning á nýja sókn og þær mynduðu lykkju.
    S.at = Date.now(); S.loading = false; notify();
  }

  /* ── teikning ───────────────────────────────────────────────────────────────────── */
  const SEV = { alv: ['Alvarlegt', 3], athuga: ['Athuga', 2], ok: ['Í lagi', 1], upp: ['Upplýsing', 0], oma: ['Ekki mælt', -1] };
  const CSS = '<style>' +
    '.vs{margin:0 0 14px;padding:0}.vs-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:11px 14px;border-bottom:1px solid var(--rule)}' +
    '.vs-h h2{margin:0;font-size:12px;letter-spacing:.16em;text-transform:uppercase}.vs-sum{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:12.5px;font-weight:600}' +
    '.vs-sum span{display:inline-flex;align-items:center;gap:6px}.vs-mute{color:var(--mute);font-weight:400}' +
    '.vs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:0}' +
    '.vs-g{padding:10px 14px 12px;border-bottom:1px solid var(--rule2);min-width:0}.vs-g>h3{margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}' +
    '.vs-r{display:grid;grid-template-columns:18px minmax(0,1fr);gap:2px 9px;padding:7px 0;border-top:1px dashed var(--rule2)}.vs-r:first-of-type{border-top:0}' +
    '.vs-led{--c:#a39a88;display:inline-block;width:13px;height:13px;margin-top:3px;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.75),var(--c) 55%);box-shadow:0 0 0 1px rgba(0,0,0,.32)}' +
    '.vs-led[data-sev="alv"]{--c:#d0301c;box-shadow:0 0 0 1px rgba(0,0,0,.32),0 0 9px #d0301c}.vs-led[data-sev="athuga"]{--c:#e0a100;box-shadow:0 0 0 1px rgba(0,0,0,.32),0 0 8px #e0a100}.vs-led[data-sev="ok"]{--c:#2f9e57;box-shadow:0 0 0 1px rgba(0,0,0,.32),0 0 7px #2f9e57}.vs-led[data-sev="upp"]{--c:#6b88ad}.vs-sum .vs-led{margin-top:0}' +
    '.vs-l1{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px}.vs-t{all:unset;cursor:pointer;font-size:13px;font-weight:600;color:var(--ink);border-bottom:1px solid var(--edge)}.vs-t:hover,.vs-t:focus-visible{border-bottom-color:var(--ink);outline:0}' +
    '.vs-n{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;margin-left:auto;text-align:right}.vs-w{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}' +
    '.vs-r[data-sev="alv"] .vs-w{color:#b3220f}.vs-r[data-sev="athuga"] .vs-w{color:#8a6500}.vs-u{grid-column:2;font-size:12px;color:var(--ink2)}' +
    '.vs-p{grid-column:2;margin:1px 0 0;padding:0 0 0 14px;list-style:disc;font-size:11.5px;color:var(--mute)}.vs-p li{margin:1px 0}.vs-p .skyr{display:inline}' +
    '.vs-a{grid-column:2;font-size:11.5px;color:var(--mute)}.vs-r.falid{opacity:.6}.vs-tomt{padding:12px 14px;color:var(--mute);font-size:13px}.vs-f{padding:6px 14px 10px}' +
    '.vs-tog{all:unset;cursor:pointer;padding:0 8px;font-size:13px;color:var(--mute)}.vs-tog:focus-visible{outline:2px solid var(--ink)}' +
    '@media (max-width:760px){.vs-n{margin-left:0;flex-basis:auto}.vs-l1{flex-wrap:nowrap}.vs-t{flex:1 1 auto;min-width:0}.vs-w{display:none}.vs-r[data-sev="alv"] .vs-n,.vs-r[data-sev="athuga"] .vs-n{font-size:15px}}</style>';

  // Á síma (≤ 760 px) eru raðirnar samanbrotnar: ljós, heiti, tala og ein lína — punktarnir og Fela/Skýring opnast með ▸.
  // Á breiðum skjá er allt opið. Opnun lifir endurteikningu (S.opna) — annars lokaðist röðin í hvert sinn sem borðið teiknast.
  const mjor = () => { try { return !!(window.matchMedia && matchMedia('(max-width: 760px)').matches); } catch (_) { return false; } };

  function radHtml(m, r, falinn, mj) {
    const sv = SEV[r.sev] || SEV.oma, api = window.Bord368 && Bord368.felaApi;
    const f = { l: 'yfirlit:mael:' + m.id, e: 'yfirlit', d: m.heiti, falinn: !!falinn };
    const s = m.slod || {};
    const tengill = s.ham ? '<button type="button" class="vs-t" data-t5="mode" data-mode="' + esc(s.ham) + '" title="Opna ' + esc(s.t) + ' — þar sem þetta er unnið">' + esc(m.heiti) + ' ›</button>'
      : s.view ? '<button type="button" class="vs-t" data-t5="vs-opna" data-v="' + esc(s.view) + '" title="Opna ' + esc(s.t) + ' — þar sem þetta er unnið">' + esc(m.heiti) + ' ›</button>'
      : '<a class="vs-t" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" title="Opna ' + esc(s.t) + ' (nýr flipi)">' + esc(m.heiti) + ' ↗</a>';
    const skyr = api ? api.skyrLina(f) : '';
    // Opinn skýringarritill heldur röðinni opinni — annars hyrfi textinn sem verið er að skrifa.
    const opin = !mj || S.opna[m.id] === true || /skyrrit/.test(skyr);
    const efni = (r.punktar && r.punktar.length) || skyr;
    const tog = mj ? '<button type="button" class="vs-tog" data-t5="vs-rad" data-id="' + esc(m.id) + '" aria-expanded="' + opin + '" aria-label="' + (opin ? 'Fela' : 'Sýna') + ' smáatriði og aðgerðir" title="' + (opin ? 'Fela' : 'Sýna') + ' smáatriði, Fela og Skýring">' + (opin ? '▾' : '▸') + '</button>' : '';
    return '<div class="vs-r' + (falinn ? ' falid' : '') + '" data-sev="' + r.sev + '">' +
      '<span class="vs-led" data-sev="' + r.sev + '" role="img" aria-label="' + sv[0] + '" title="' + sv[0] + '"></span>' +
      '<div class="vs-l1">' + tengill + ((r.sev === 'alv' || r.sev === 'athuga') ? '<span class="vs-w">' + sv[0] + '</span>' : '') + '<span class="vs-n">' + esc(r.tala) + '</span>' + tog + '</div>' +
      (r.undir ? '<div class="vs-u">' + esc(r.undir) + '</div>' : '') +
      (opin ? (efni ? '<ul class="vs-p">' + (r.punktar || []).map(p => '<li>' + esc(p) + '</li>').join('') + (skyr ? '<li>' + skyr + '</li>' : '') + '</ul>' : '') +
        '<div class="vs-a">' + (api ? api.felaTakki(f).replace(/^ · /, '') : '') + '</div>' : '') + '</div>';
  }

  function html(n) {
    if (n !== EIGANDI) return '';
    const api = window.Bord368 && Bord368.felaApi, mj = mjor();
    // Samanbrotið er viðmótsval — geymt með Vidmot (472, eitt val fyrir allar vélar), aldrei í localStorage.
    if (S.fellt == null) { try { S.fellt = !!(window.Vidmot && Vidmot.lesaTaeki && Vidmot.lesaTaeki(FELLT_LYKILL, false)); } catch (_) { S.fellt = false; } }
    if (!S.at || Date.now() - S.at > SKYNDI) load();
    const lifandi = {}; MAEL.filter(m => m.live).forEach(m => { try { lifandi[m.id] = m.live(); } catch (_) { lifandi[m.id] = null; } });
    const rod = MAEL.map(m => {
      let r = m.live ? lifandi[m.id] : (S.res && S.res[m.id]);
      if (!r) r = { sev: 'oma', tala: '…', undir: S.loading || m.live ? 'Sæki…' : 'Ekki mælt enn', punktar: [] };
      return { m, r, falid: !!(api && api.erFalid('yfirlit:mael:' + m.id)) };
    });
    const synd = rod.filter(x => !x.falid), falin = rod.filter(x => x.falid);
    const tel = k => synd.filter(x => x.r.sev === k).length;
    // „Bara rautt og gult": sjálfgefið á síma, þar sem 26 línur eru langt skrun. Ljósin í hausnum telja alltaf allt.
    const bara = S.bara == null ? mj : S.bara;
    const vis = bara ? synd.filter(x => x.r.sev === 'alv' || x.r.sev === 'athuga' || x.r.sev === 'oma') : synd;
    const sum = '<div class="vs-sum" role="status">' + ['alv', 'athuga', 'ok'].map(k => '<span><span class="vs-led" data-sev="' + k + '" aria-hidden="true"></span>' + tel(k) + ' ' + SEV[k][0].toLowerCase() + '</span>').join('') +
      (tel('oma') ? '<span class="vs-mute">' + tel('oma') + ' ekki mælt</span>' : '') + '</div>';
    const haus = '<header class="vs-h"><h2>Vinnusamantekt</h2>' + sum + '<span class="vs-mute">' + (S.loading ? 'mæli…' : S.at ? 'mælt kl. ' + klst(new Date(S.at)) : '') + '</span><span class="grow"></span>' +
      '<button type="button" class="btn iv sm" data-t5="vs-sia" aria-pressed="' + bara + '" title="Sýna aðeins það sem er rautt eða gult">' + (bara ? 'Sýna allt' : 'Bara rautt og gult') + '</button>' +
      '<button type="button" class="btn iv sm" data-t5="vs-endurhlada"' + (S.loading ? ' disabled' : '') + ' title="Telja allt upp á nýtt úr gagnagrunninum">↻ Endurmæla</button>' +
      '<button type="button" class="btn iv sm tog" data-t5="vs-fella" aria-expanded="' + !S.fellt + '" aria-label="' + (S.fellt ? 'Opna' : 'Fella saman') + ' vinnusamantekt">' + (S.fellt ? '▾' : '▴') + '</button></header>';
    if (S.fellt) return CSS + '<section class="panel vs" aria-label="Vinnusamantekt">' + haus + '</section>';
    const hopar = [];
    vis.forEach(x => { let h = hopar.find(y => y.n === x.m.hopur); if (!h) hopar.push(h = { n: x.m.hopur, l: [] }); h.l.push(x); });
    const flokkar = hopar.map(h => '<section class="vs-g" aria-label="' + esc(h.n) + '"><h3>' + esc(h.n) + '</h3>' + h.l.map(x => radHtml(x.m, x.r, false, mj)).join('') + '</section>').join('');
    const faldarHtml = falin.length && api ? '<div class="vs-f">' + api.falinHtml('vs', falin.length, () => falin.map(x => radHtml(x.m, x.r, true, mj)).join('')) + '</div>' : '';
    const faerri = synd.length - vis.length;
    return CSS + '<section class="panel vs" aria-label="Vinnusamantekt">' + haus +
      (S.villa ? '<p class="err" style="margin:8px 14px">Náði ekki að mæla: ' + esc(S.villa) + '</p>' : '') +
      (flokkar ? '<div class="vs-grid">' + flokkar + '</div>' : '<p class="vs-tomt">' + (synd.length ? 'Ekkert er rautt eða gult.' : 'Allt er falið — opnaðu „N falin“ hér að neðan til að sýna aftur.') + '</p>') +
      (faerri ? '<p class="vs-tomt" style="padding-top:0">' + faerri + ' línur í lagi eða upplýsing eru faldar í þessari sýn · <button type="button" class="fela" data-t5="vs-sia">Sýna allt</button></p>' : '') + faldarHtml + '</section>';
  }

  // Smellir sem 368 sendir hingað (data-t5="vs-*"). Skilar true ef smellurinn var okkar.
  function smellur(el) {
    const a = el && el.dataset && el.dataset.t5;
    if (!a || a.indexOf('vs-') !== 0) return false;
    if (a === 'vs-endurhlada') { load(true); return true; }
    if (a === 'vs-fella') { S.fellt = !S.fellt; try { if (window.Vidmot && Vidmot.setjaTaeki) Vidmot.setjaTaeki(FELLT_LYKILL, S.fellt); } catch (_) {} notify(); return true; }
    if (a === 'vs-sia') { S.bara = !(S.bara == null ? mjor() : S.bara); notify(); return true; }
    if (a === 'vs-rad') { const id = el.dataset.id; S.opna[id] = !S.opna[id]; notify(); return true; }
    if (a === 'vs-opna') { try { if (window.App && App.switchView) App.switchView(el.dataset.v); } catch (_) {} return true; }
    return false;
  }

  window.Vinnusamantekt = { html, load, smellur, S, MAEL, THR, EIGANDI, version: '2026-10-29' };
})();
