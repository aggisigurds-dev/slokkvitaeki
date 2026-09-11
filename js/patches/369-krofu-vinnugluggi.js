/* === KRÖFU-VINNUGLUGGI — forgangslisti krafna og vinnugluggi með þrepum (369) ======================
 *
 * Agnar 11.09.2026: „fara í gegnum allt og gera forgangslista, með upphæðum, hvað þarf að gera til að
 * ná hverri upphæð … að ég geti byrjað á stærstu hlutunum" · „geta ýtt á þessi atriði og kæmi þá upp
 * einhver vinnugluggi sem leiðir mig gegnum það að klára það af á staðunum" · „ég kanski bara ýti á
 * takka sem stendur 'Tilbúið í vinnslu', læt þig vita, þú keyrir vinnsluna í gegn svo hún endi bara
 * ósend inn á kröfuyfirlit.... ég þá athuga skýrsluna, reikninginn, og sendi af stað".
 *
 * HVAR: eining „22 Forgangslisti krafna" í Kröfur-ham Þjónustuborðsins (368). 368 kallar aðeins á
 *   KrofuVinnugluggi.listi() / samantekt() / takkar() / festa(rót). Vinnuglugginn er lag inni í
 *   skuggarót 368: sömu litir og letur, og hann felst með borðinu þegar farið er á annan stað um
 *   djúptengil — og stendur opinn þegar komið er aftur á borðið.
 *
 * HARÐAR REGLUR
 *   • Glugginn SENDIR ALDREI neitt: engin krafa, enginn póstur, ekkert Payday-kall. Lokasending er
 *     alltaf Agnars. Varið af tools/audit-krofu-vinnugluggi.cjs (engin fetch, skrif aðeins á krofu_verkferli).
 *   • Eina skrifleiðin er krofu_verkferli (framvinda málsins). „Tilbúið í vinnslu" setur stöðuna og
 *     gerir EKKERT annað. Vinnslan (🤖-þrepin) er unnin síðar í þeirri röð sem verðirnir í payday-push
 *     búast við: void 409 · customer_base_id 422 · tvítak 409 — og hvert ⚠-þrep lesið til baka.
 *   • Staða býr á þjóninum (fjórar vélar, SAMSTILLT-reglan): lesin fersk við opnun, skrifuð skilyrt á
 *     updated_at og lesin til baka. Aldrei localStorage.
 *   • greitt síðar → reikningur aðeins í aðra áttina, og aðeins um „→ Í kröfu" í 166.
 *   • Stólpi (fyrri eigendur): „opið við yfirtöku" telst greitt til fyrri eiganda og er aldrei rukkað.
 *     Stólpa-reikningar eru hér aðeins verðviðmið fyrir gleymdar úttektir.
 *
 * MÁLATEGUNDIR (mælt 11.09.2026 á lifandi gögnum)
 *   itreka             sent í Payday (SENT), kominn fram yfir gjalddaga, ógreitt
 *   senda_krofu        reikningur sem fór aldrei í kröfu (engin sent-merki)
 *   payday_drog        sent-merki á sölunni en AÐEINS DRAFT í Payday — kúnninn fékk ekkert (13 · 446.805 kr)
 *   krafa_ekki_stofnud Payday-reikningur án bankakröfu. Spegillinn veit það ekki, svo flaggið er mál í
 *                      krofu_verkferli (stofnað í glugganum eða með SQL-inu)
 *   faera_kt           rangur greiðandi → færa á aðra kennitölu (markfélag til / þarf að stofna)
 *   gleymt             úttektarskýrsla ársins án reiknings (v_gleymt_ad_rukka_uttekt), upphæð áætluð
 *   greitt_sidar       greitt-síðar drög eldri en 14 daga
 *   aud_sala           final/sótt sala án lína
 *   stadfesta_greidslu kort/reiðufé aldrei merkt greitt — eða Payday segir greitt en salan er ómerkt
 *   annad              annað, m.a. ósamræmi milli sölu og Payday
 *   Eitt virkt mál á sölu: handvirkt mál víkur reiknuðu máli sömu sölu af listanum.
 *
 * OPNAÐ ÚR ÖÐRUM LISTUM (369b — Agnar 11.09.2026: „þetta er svoldið bara upplýsingablað en ekki vinnustofa")
 *   opnaSolu(solurId) · opnaGleymt(fyrirtaekiId) · malFyrirSolu(solurId). 368 setur „Vinna ›" á raðir í Kröfum og
 *   „Gleymst að rukka?". Vanti listann er hann sóttur og glugginn opnast þegar gögnin koma. Mál er ALDREI stofnað
 *   hér: finnist ekkert mál segir skýringin af hverju (t.d. send krafa sem er ekki komin á gjalddaga).
 *   Gleymdar úttektir sýna skoðunarmánuð, vinnublað og síðasta Stólpa-reikning (sql/2026-09-11_gleymt_uttekt_stolpi.sql);
 *   Stólpa-upphæðin er verðviðmið þegar enginn fyrri reikningur finnst — aldrei krafa.
 * ============================================================================================== */
(() => {
  if (window.KrofuVinnugluggi) return;

  const VIEW_ID = 'view-bord';
  const MAX_ALDUR = 300000;          // 5 mín, sama og latar einingar í 368
  const SYND = 25;
  const AR = () => new Date().getFullYear();

  const sb = () => (window.DB && DB.sb) || null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kr = x => Math.round(Number(x) || 0).toLocaleString('is-IS').replace(/,/g, '.') + ' kr.';
  const tStamp = s => { const t = Date.parse(s); return isNaN(t) ? 0 : t; };
  const tvo = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + tvo(d.getMonth() + 1) + '-' + tvo(d.getDate());
  const dagsHlutur = iso => (/^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) ? new Date(iso + 'T12:00:00') : new Date(iso));
  const dags = iso => { if (!iso) return ''; const d = dagsHlutur(iso); return isNaN(d.getTime()) ? '' : tvo(d.getDate()) + '.' + tvo(d.getMonth() + 1) + '.' + d.getFullYear(); };
  const klukka = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d.getTime()) ? '' : dags(iso) + ' kl. ' + tvo(d.getHours()) + ':' + tvo(d.getMinutes()); };
  // Heilir dagar frá dagsetningu til dagsins í dag (staðartími) — sama tala og `current_date - dags` í SQL.
  const dagaMunur = iso => {
    const d = dagsHlutur(iso);
    if (isNaN(d.getTime())) return 0;
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()), b = new Date();
    b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / 864e5);
  };
  const tolur = s => String(s == null ? '' : s).replace(/\D/g, '');
  const ktBirt = s => { const d = tolur(s); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : String(s || ''); };
  // Vartala (9. stafur, vogir 3,2,7,6,5,4,3,2) og öld (10. stafur 9, 0 eða 8) — sama regla og 17 og 310.
  function ktGild(s) {
    const d = tolur(s);
    if (d.length !== 10 || d === '9999999999') return false;
    const w = [3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += (+d[i]) * w[i];
    let v = 11 - (sum % 11);
    if (v === 11) v = 0;
    if (v === 10 || v !== +d[8]) return false;
    return d[9] === '9' || d[9] === '0' || d[9] === '8';
  }
  const nu = () => { try { return (window.BordStarfsmadur && BordStarfsmadur.get()) || 'Agnar'; } catch (_) { return 'Agnar'; } };
  // Engin kennitala í villuskrána (ORYGGISNET regla 6) — villuboð PostgREST geta borið gildin sjálf.
  const hreinsaKt = s => String(s || '').replace(/(?<!\d)\d{6}-?\d{4}(?!\d)/g, '[kt]');
  function skraVillu(kind, detail) { try { if (window.logProblem) window.logProblem(kind, hreinsaKt(detail).slice(0, 400)); } catch (_) {} }
  const taflaEkkiTil = e => !!e && (e.code === 'PGRST205' || e.code === '42P01' ||
    (/krofu_verkferli/.test(String(e.message || '')) && /does not exist|schema cache|Could not find/i.test(String(e.message || ''))));
  const merktSend = s => !!(s && (s.krafa_sent_at || s.invoiced_at || s.dk_invoice_id));
  const hefurLinur = s => !!(s && Array.isArray(s.linur) && s.linur.length);
  const MAN_NOFN = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  const VB_STODUR = { bidur: 'bíður', samthykkt: 'samþykkt', klarad: 'klárað' };
  // Skoðun gleymdrar úttektar: dagsetning skýrslu þegar hún er skráð, annars mánuður úr tækjaskrá (uttaeki.last_insp).
  function skodunTexti(g) {
    const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(String((g && g.skodun_dags) || ''));
    if (!d) return g && g.skyrsla_dags && !/-01-01$/.test(g.skyrsla_dags) ? dags(g.skyrsla_dags) : AR() + ' (mánuður óþekktur)';
    return g.skodun_heimild === 'skyrsla' ? dags(g.skodun_dags) : MAN_NOFN[+d[2] - 1] + ' ' + d[1];
  }

  const STODUR = { opid: 'Opið', tilbuid_i_vinnslu: 'Tilbúið í vinnslu', i_vinnslu: 'Í vinnslu', i_yfirferd_agnars: 'Í yfirferð Agnars', lokid: 'Lokið', sleppt: 'Sleppt' };
  const LOKAD = { lokid: 1, sleppt: 1 };
  const HANDVIRK = { faera_kt: 1, krafa_ekki_stofnud: 1, annad: 1 };
  // Leyfðar breytingar á stöðu. Vinnslan (Claude) færir tilbuid_i_vinnslu → i_vinnslu → i_yfirferd_agnars.
  const LEYFT = {
    opid: ['tilbuid_i_vinnslu', 'sleppt'],
    tilbuid_i_vinnslu: ['opid', 'i_vinnslu', 'sleppt'],
    i_vinnslu: ['i_yfirferd_agnars', 'tilbuid_i_vinnslu', 'opid'],
    i_yfirferd_agnars: ['lokid', 'tilbuid_i_vinnslu'],
    lokid: ['opid'],
    sleppt: ['opid']
  };
  const TEG = {
    itreka:             { l: 'Ítreka',             t: 'Ítreka ógreidda kröfu',          lina: 'Athuga greiðslu, hringja eða senda ítrekun' },
    senda_krofu:        { l: 'Senda kröfu',        t: 'Senda kröfu sem fór aldrei',     lina: 'Fara yfir og senda úr Kröfuyfirliti' },
    payday_drog:        { l: 'Payday-drög',        t: 'Payday-drög → senda',            lina: 'Yfirfara drögin og senda úr Payday' },
    krafa_ekki_stofnud: { l: 'Krafa ekki stofnuð', t: 'Krafa ekki stofnuð í banka',     lina: 'Stofna kröfu eða senda greiðsluupplýsingar' },
    faera_kt:           { l: 'Færa á aðra kt.',    t: 'Færa reikning á aðra kennitölu', lina: 'Afturkalla, færa greiðanda og senda aftur' },
    gleymt:             { l: 'Gleymd úttekt',      t: 'Rukka gleymda úttekt',           lina: 'Gera reikning úr skýrslunni' },
    greitt_sidar:       { l: 'Greitt síðar',       t: 'Klára greitt-síðar sölu',        lina: 'Staðfesta greiðslumáta og færa í reikning' },
    aud_sala:           { l: 'Auð sala',           t: 'Laga auða sölu (engar línur)',   lina: 'Finna hvað var selt: bæta við línum eða ógilda' },
    stadfesta_greidslu: { l: 'Staðfesta greiðslu', t: 'Staðfesta greiðslu',             lina: 'Bera við uppgjör og merkja greitt' },
    annad:              { l: 'Annað',              t: 'Annað',                          lina: 'Sjá lýsingu' }
  };
  const TEG_ROD = Object.keys(TEG);
  const LEIDIR = { payday: 'Stofna kröfu í Payday', uppl: 'Senda greiðsluupplýsingar', endursenda: 'Afturkalla og senda aftur' };
  const VIDVORUN = {
    itreka: 'Ekki nota „Kredit + endurútgáfu" (26) á ógreiddan sendan reikning — hún kallar aldrei á Payday og bankakrafan stendur eftir.',
    payday_drog: '„⊘ Afturkalla" (payday-push cancel) setur reikninginn fyrst í SENT og fellir hann svo. Á drögum gæti það SENT reikninginn — óprófað gegn Payday. Sendu drögin frekar beint úr Payday.',
    krafa_ekki_stofnud: 'Svarnetfang Eignaumsjónar er no-reply: svar við þeirra pósti berst ekki. Senda þarf NÝJAN póst á gjaldkeri@eignaumsjon.is.',
    faera_kt: '⚠-þrepin eru unnin í þessari röð og hvert lesið til baka: afturkalla → uppfæra sölu → salan situr ósend. „Kredit + endurútgáfa" (26) er röng leið — hún kallar ekki á Payday.',
    greitt_sidar: 'Aðeins í aðra áttina: greitt síðar → reikningur. Aldrei til baka.',
    gleymt: 'Stólpi (fyrri eigendur): reikningur „opið við yfirtöku" telst greiddur til fyrri eiganda og er aldrei rukkaður. Hér er hann aðeins verðviðmið.'
  };
  const FOT_TEXTI = {
    opid: '„Tilbúið í vinnslu" setur málið í röð hjá Claude og gerir ekkert annað — ekkert er sent.',
    tilbuid_i_vinnslu: 'Bíður vinnslu. Claude vinnur 🤖-þrepin í röð og skilar kröfunni ÓSENDRI í Kröfuyfirlit.',
    i_vinnslu: 'Claude er að vinna í málinu.',
    i_yfirferd_agnars: 'Vinnslu lokið — krafan situr ósend í Kröfuyfirliti. Farðu yfir skýrslu og reikning og sendu þaðan.',
    lokid: 'Málinu er lokið.',
    sleppt: 'Málinu var sleppt.'
  };

  const S = {
    d: null, at: 0, bid: false, villa: '',
    rod: 'upphaed', synd: SYND, opinTegund: '',
    lag: null,       // lagið í skuggarót 368
    gl: null         // opinn gluggi: { m, x, vf, bid, villa, drog, busy, form, sleppaOpid, athStada }
  };
  const teiknaBord = () => { try { if (window.Thjonustubord5 && Thjonustubord5.render) Thjonustubord5.render(); } catch (_) {} };

  /* ── gögn listans ── */
  async function saekja() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const fjortan = new Date(Date.now() - 14 * 864e5).toISOString();
    const [ro, rk, rs, rkort, raud, rg, rv] = await Promise.all([
      c.from('solur').select('id,num,customer_nafn,customer_kt,customer_base_id,customer_id,samtals,status,greitt_med,paid_at,created_at,krafa_sent_at,invoiced_at,dk_invoice_id,krafa_note,is_credit,credit_of,source,linur')
        .eq('greitt_med', 'reikningur').is('paid_at', null).or('status.is.null,status.neq.void'),
      c.from('solur').select('credit_of').eq('is_credit', true).not('credit_of', 'is', null),
      c.from('solur').select('id,num,customer_nafn,customer_kt,customer_base_id,customer_id,samtals,status,greitt_med,paid_at,created_at,krafa_sent_at,invoiced_at,dk_invoice_id,krafa_note,is_credit,credit_of,source,linur')
        .eq('greitt_med', 'greitt_sidar').eq('status', 'drog').is('paid_at', null).lt('created_at', fjortan),
      c.from('solur').select('id,num,customer_nafn,customer_kt,customer_base_id,customer_id,samtals,status,greitt_med,paid_at,created_at,krafa_sent_at,invoiced_at,dk_invoice_id,krafa_note,is_credit,credit_of,source,linur')
        .in('greitt_med', ['kort', 'reidufe']).eq('status', 'final').is('paid_at', null).not('is_credit', 'is', true),
      c.from('solur').select('id,num,customer_nafn,customer_kt,customer_base_id,customer_id,samtals,status,greitt_med,paid_at,created_at,krafa_sent_at,invoiced_at,dk_invoice_id,krafa_note,is_credit,credit_of,source,linur')
        .in('status', ['final', 'sott']).or('linur.is.null,linur.eq.[]'),
      c.from('v_gleymt_ad_rukka_uttekt').select('fyrirtaeki_id,nafn,kennitala,heimilisfang,postnumer,customer_base_id,skyrslur,skyrsla_dags,skodun_dags,skodun_heimild,vinnublad_id,vinnublad_manudur,vinnublad_dags,vinnublad_stada,stolpi_sidast_nr,stolpi_sidast_dags,stolpi_sidast_stada,stolpi_sidast_upphaed'),
      c.from('krofu_verkferli').select('*')
    ]);
    // Aðalsettið og kredit-útilokunin eru fail-LOUD: án credit_of slyppu bakfærðar mæður inn sem ógreiddar.
    if (ro.error) throw ro.error;
    if (rk.error) throw rk.error;
    const vantar = [];
    const taflaVantar = !!(rv.error && taflaEkkiTil(rv.error));
    if (rv.error && !taflaVantar) vantar.push('framvinda (krofu_verkferli): ' + rv.error.message);
    [['greitt síðar', rs], ['kort og reiðufé', rkort], ['auðar sölur', raud], ['gleymdar úttektir', rg]].forEach(([l, r]) => { if (r.error) vantar.push(l + ': ' + r.error.message); });
    const vf = rv.error ? [] : (rv.data || []);
    const solurById = {};
    [ro, rs, rkort, raud].forEach(r => (r.data || []).forEach(s => { solurById[s.id] = s; }));
    const aukaIds = [...new Set(vf.filter(v => v.solur_id && !solurById[v.solur_id]).map(v => v.solur_id))];
    if (aukaIds.length) {
      const ra = await c.from('solur').select('id,num,customer_nafn,customer_kt,customer_base_id,customer_id,samtals,status,greitt_med,paid_at,created_at,krafa_sent_at,invoiced_at,dk_invoice_id,krafa_note,is_credit,credit_of,source,linur').in('id', aukaIds);
      if (ra.error) vantar.push('sölur handvirkra mála: ' + ra.error.message);
      (ra.data || []).forEach(s => { solurById[s.id] = s; });
    }
    const dk = new Set();
    Object.keys(solurById).forEach(id => { if (solurById[id].dk_invoice_id) dk.add(solurById[id].dk_invoice_id); });
    vf.forEach(v => { const u = v.gogn && v.gogn.upphaflegt; if (u && u.dk_invoice_id) dk.add(u.dk_invoice_id); });
    let payday = [];
    if (dk.size) {
      // Parað á payday_id = dk_invoice_id, ekki reference: ógildur reikningur og kreditreikningur hans deila reference.
      const rp = await c.from('payday_invoices_slokk').select('payday_id,number,kt,customer_name,amount_total,created_date,due_date,final_due_date,paid_date,status,reference,updated_at').in('payday_id', [...dk]);
      // Flokkunin stendur og fellur með speglinum (DRAFT/SENT/PAID) — án hans er ekkert sýnt frekar en rangt.
      if (rp.error) throw rp.error;
      payday = rp.data || [];
    }
    const gleymt = rg.data || [];
    let skjol = [];
    const fids = gleymt.map(g => g.fyrirtaeki_id).filter(Boolean), bids = gleymt.map(g => g.customer_base_id).filter(Boolean);
    if (fids.length) {
      const [r1, r2] = await Promise.all([
        c.from('customer_documents').select('fyrirtaeki_id,customer_base_id,amount,year,doc_date,invoice_number,stolpi_stada').eq('doc_type', 'reikningur').gt('amount', 0).in('fyrirtaeki_id', fids),
        bids.length ? c.from('customer_documents').select('fyrirtaeki_id,customer_base_id,amount,year,doc_date,invoice_number,stolpi_stada').eq('doc_type', 'reikningur').gt('amount', 0).in('customer_base_id', bids) : Promise.resolve({ data: [], error: null })
      ]);
      if (r1.error || r2.error) vantar.push('verðviðmið gleymdra úttekta: ' + (r1.error || r2.error).message);
      skjol = (r1.data || []).concat(r2.data || []);
    }
    return flokka({ opin: ro.data || [], sidar: rs.data || [], kort: rkort.data || [], audar: raud.data || [], gleymt, skjol, payday, vf, solurById,
      kredit: new Set((rk.data || []).map(x => x.credit_of)), taflaVantar, vantar });
  }

  // Verðviðmið gleymdrar úttektar: nýjasti reikningur staðarins, annars kúnnans, annars síðasti Stólpa-reikningur á
  // kennitölunni (v_gleymt_ad_rukka_uttekt.stolpi_sidast_*). Kreditfærðir sleppa. Viðmið er aldrei krafa.
  function vidmid(g, skjol) {
    const gilt = d => d && +d.amount > 0 && d.stolpi_stada !== 'kreditfaert' && d.stolpi_stada !== 'kreditreikningur';
    const rod = (a, b) => tStamp(b.doc_date || (b.year + '-01-01')) - tStamp(a.doc_date || (a.year + '-01-01'));
    const afStad = skjol.filter(d => gilt(d) && d.fyrirtaeki_id === g.fyrirtaeki_id).sort(rod);
    if (afStad.length) return Object.assign({ af: 'staðnum' }, afStad[0]);
    const afKunna = g.customer_base_id ? skjol.filter(d => gilt(d) && d.customer_base_id === g.customer_base_id).sort(rod) : [];
    if (afKunna.length) return Object.assign({ af: 'kúnnanum' }, afKunna[0]);
    return +g.stolpi_sidast_upphaed > 0 ? { af: 'Stólpa (fyrri eigendum)', stolpi: true, amount: +g.stolpi_sidast_upphaed, invoice_number: ('Stólpi ' + (g.stolpi_sidast_nr || '')).trim(),
      doc_date: g.stolpi_sidast_dags || null, year: g.stolpi_sidast_dags ? +String(g.stolpi_sidast_dags).slice(0, 4) : null } : null;
  }

  function flokka(r) {
    const idag = ymd(new Date());
    const pd = {};
    r.payday.forEach(p => { pd[p.payday_id] = p; });
    const vfLykill = {}, handvirkSala = {};
    r.vf.forEach(v => {
      vfLykill[v.mal_lykill] = v;
      if (v.solur_id && HANDVIRK[v.tegund] && !LOKAD[v.stada]) handvirkSala[v.solur_id] = v;
    });
    const mal = [], iInnheimtu = [], sed = {};
    // Sölur sem fá ekkert mál fá skýringu — „Vinna ›" í 368 segir hana í stað „fannst ekki".
    const utan = {}, KREDIT = 'Salan er bakfærð með kreditreikningi — ekkert að rukka.';
    const kreditfaert = s => !!(s.is_credit || r.kredit.has(s.id));
    const grunnur = s => ({ solur_id: s.id, num: s.num || '', nafn: s.customer_nafn || '(ónefnt)', kt: s.customer_kt || '', upphaed: +s.samtals || 0,
      customer_base_id: s.customer_base_id || null, fyrirtaeki_id: s.customer_id || null, stofnad: s.created_at });
    const baeta = (m, tegund, lykill, auka) => {
      if (sed[lykill]) return;
      sed[lykill] = 1;
      mal.push(Object.assign(m, { tegund, lykill, vf: vfLykill[lykill] || null }, auka || {}));
    };
    r.opin.forEach(s => {
      if (kreditfaert(s)) { utan[s.id] = KREDIT; return; }
      if (handvirkSala[s.id]) return;
      const id = 'solur:' + s.id + ':';
      if (!merktSend(s)) { const t = hefurLinur(s) ? 'senda_krofu' : 'aud_sala'; baeta(grunnur(s), t, id + t); return; }
      const p = s.dk_invoice_id ? pd[s.dk_invoice_id] || null : null;
      if (!p) { baeta(grunnur(s), 'annad', id + 'osamraemi', { astaeda: 'Salan er merkt send en enginn Payday-reikningur fannst í speglinum (payday_id = dk_invoice_id). Athuga hvort reikningurinn sé til í Payday.' }); return; }
      if (p.status === 'DRAFT') { baeta(grunnur(s), 'payday_drog', id + 'payday_drog'); return; }
      if (p.status === 'PAID' || p.paid_date) { baeta(grunnur(s), 'stadfesta_greidslu', id + 'stadfesta_greidslu'); return; }
      if (p.status !== 'SENT') { baeta(grunnur(s), 'annad', id + 'osamraemi', { astaeda: 'Payday-reikningurinn er ' + p.status + ' en salan er enn merkt send og ógreidd. Stemma þarf af sölu og Payday.' }); return; }
      if (p.due_date && p.due_date < idag) { baeta(grunnur(s), 'itreka', id + 'itreka'); return; }
      iInnheimtu.push(s);                   // SENT og ekki kominn á gjalddaga: ekkert að gera í dag
      utan[s.id] = 'Krafan er send (Payday nr. ' + (p.number || '—') + ') og ' + (p.due_date ? 'gjalddaginn ' + dags(p.due_date) + ' er ekki liðinn' : 'enginn gjalddagi er skráður') + ' — ekkert að gera enn.';
    });
    r.sidar.forEach(s => { if (kreditfaert(s)) utan[s.id] = KREDIT; else if (!handvirkSala[s.id]) baeta(grunnur(s), 'greitt_sidar', 'solur:' + s.id + ':greitt_sidar'); });
    r.kort.forEach(s => { if (kreditfaert(s)) utan[s.id] = KREDIT; else if (!handvirkSala[s.id]) baeta(grunnur(s), 'stadfesta_greidslu', 'solur:' + s.id + ':stadfesta_greidslu'); });
    r.audar.forEach(s => { if (!handvirkSala[s.id]) baeta(grunnur(s), 'aud_sala', 'solur:' + s.id + ':aud_sala'); });
    r.gleymt.forEach(g => {
      const v = vidmid(g, r.skjol);
      baeta({ solur_id: null, num: '', nafn: g.nafn || '(ónefnt)', kt: g.kennitala || '', upphaed: v ? +v.amount || 0 : 0, aaetlad: !!v, vidmid: v,
        customer_base_id: g.customer_base_id || null, fyrirtaeki_id: g.fyrirtaeki_id, stofnad: g.skyrsla_dags, gleymt: g }, 'gleymt', 'fyrirtaeki:' + g.fyrirtaeki_id + ':gleymt:' + AR());
    });
    // Mál sem búa aðeins í framvindutöflunni: handvirk mál, og virk reiknuð mál sem gögnin sýna ekki lengur.
    r.vf.forEach(v => {
      if (sed[v.mal_lykill] || LOKAD[v.stada]) return;
      if (!HANDVIRK[v.tegund] && v.stada === 'opid') return;
      const s = v.solur_id ? r.solurById[v.solur_id] || null : null, g = v.gogn || {};
      const m = s ? grunnur(s) : { solur_id: v.solur_id || null, num: g.num || '', nafn: g.nafn || '(mál #' + v.id + ')', kt: '', upphaed: +v.upphaed || 0,
        customer_base_id: v.customer_base_id || null, fyrirtaeki_id: v.fyrirtaeki_id || null, stofnad: v.created_at };
      baeta(m, TEG[v.tegund] ? v.tegund : 'annad', v.mal_lykill, HANDVIRK[v.tegund] ? null
        : { breytt: 'Gögnin sýna þetta mál ekki lengur (' + (s ? (s.paid_at ? 'salan er greidd' : 'staða sölunnar breyttist')
          : v.tegund === 'gleymt' ? 'úttektin er ekki lengur á lista gleymdra — reikningur gerður eða rukkuð gegnum Stólpa' : 'salan fannst ekki') + ') — athugaðu hvort því sé lokið.' });
    });
    mal.forEach(m => {
      m.s = m.solur_id ? r.solurById[m.solur_id] || null : null;
      const u = m.vf && m.vf.gogn && m.vf.gogn.upphaflegt;
      const dkId = (m.s && m.s.dk_invoice_id) || (u && u.dk_invoice_id) || null;
      m.p = dkId ? pd[dkId] || null : null;
    });
    mal.sort((a, b) => (b.upphaed - a.upphaed) || (tStamp(a.stofnad) - tStamp(b.stofnad)));
    return { mal, iInnheimtu, utan, taflaVantar: r.taflaVantar, vantar: r.vantar };
  }

  function tryggja(afl) {
    if (S.bid) return;
    if (!afl && S.at && Date.now() - S.at < MAX_ALDUR) return;
    S.bid = true;
    saekja().then(d => { S.d = d; S.villa = ''; }, e => { S.villa = (e && e.message) || String(e); skraVillu('krofumal_saekja', S.villa); })
      .then(() => { S.bid = false; S.at = Date.now(); teiknaBord(); if (S.gl) teiknaGlugga(); vinnaBidur(); if (S.aftur) { S.aftur = false; tryggja(true); } });
  }
  async function endurhlada() {
    S.bid = true;
    try { S.d = await saekja(); S.villa = ''; } catch (e) { S.villa = (e && e.message) || String(e); skraVillu('krofumal_saekja', S.villa); }
    S.bid = false;
    S.at = Date.now();
    teiknaBord();
    vinnaBidur();
  }

  /* ── forgangslistinn (teiknaður inni í einingu 368) ── */
  const stadaMals = m => (m.vf && m.vf.stada) || 'opid';
  const summa = l => l.reduce((a, m) => a + (m.upphaed > 0 ? m.upphaed : 0), 0);
  function lysing(m) {
    const p = m.p, s = m.s, idag = ymd(new Date());
    switch (m.tegund) {
      case 'itreka': return p && p.due_date ? dagaMunur(p.due_date) + ' d. yfir gjalddaga' : 'yfir gjalddaga';
      case 'senda_krofu': return 'aldrei send · ' + dagaMunur(m.stofnad) + ' d.';
      case 'payday_drog': return 'aðeins drög í Payday' + (p && p.due_date && p.due_date < idag ? ' · gjalddagi dróganna liðinn' : '');
      case 'krafa_ekki_stofnud': return 'engin bankakrafa' + (p && p.due_date ? ' · gjalddagi ' + dags(p.due_date) : '');
      case 'faera_kt': { const g = (m.vf && m.vf.gogn) || {}; return 'á ' + (g.markkt ? 'kt. ' + ktBirt(g.markkt) : '(kennitölu vantar)'); }
      case 'gleymt': return 'skoðun ' + skodunTexti(m.gleymt) + (m.gleymt && m.gleymt.vinnublad_id ? ' · á vinnublaði' : '') +
        ' · ' + (m.aaetlad ? 'áætlað út frá ' + (m.vidmid.invoice_number || 'fyrri reikningi') : 'upphæð óþekkt');
      case 'greitt_sidar': return 'drög frá ' + dags(m.stofnad) + ' · ' + dagaMunur(m.stofnad) + ' d.';
      case 'aud_sala': return (s ? s.status + ' · ' : '') + 'engar línur';
      case 'stadfesta_greidslu': return s && s.greitt_med === 'reikningur' ? 'Payday segir greitt' : (s && s.greitt_med === 'kort' ? 'kort' : 'reiðufé') + ' · ' + dags(m.stofnad);
      default: return String(m.astaeda || (m.vf && ((m.vf.gogn && m.vf.gogn.texti) || m.vf.athugasemd)) || '').slice(0, 90);
    }
  }
  function rodHtml(m) {
    const st = stadaMals(m), t = TEG[m.tegund] || TEG.annad;
    const upph = m.upphaed > 0 ? (m.aaetlad ? '≈ ' : '') + kr(m.upphaed) : (m.tegund === 'gleymt' ? 'óþekkt' : '0 kr.');
    return '<div class="kvrow' + (st !== 'opid' ? ' kvvirk' : '') + '" data-tegund="' + m.tegund + '">' +
      '<button type="button" class="kvpick" data-kv="opna" data-lykill="' + esc(m.lykill) + '" title="Opna vinnuglugga">' +
        '<span class="kvtop"><b class="kvn">' + esc(m.nafn) + '</b><span class="kvu">' + upph + '</span></span>' +
        '<span class="kvs"><em class="kvt">' + esc(t.l) + '</em>' + (m.num ? esc(m.num) + ' · ' : '') + esc(lysing(m)) + '</span>' +
        '<span class="kvl">→ ' + esc(t.lina) + '</span>' +
      '</button>' +
      (st !== 'opid' ? '<span class="kvst st-' + st + '">' + esc(STODUR[st] || st) + '</span>' : '') +
    '</div>';
  }
  const kb = (l, v, km) => '<div class="kbox"><div class="lbl">' + l + '</div><div class="v">' + v + '</div><div class="km">' + km + '</div></div>';
  const bannHtml = () => '<div class="kvbann">Framvinda vistast ekki enn: taflan <code>krofu_verkferli</code> er ekki til (sql/2026-09-11_krofu_verkferli.sql bíður yfirferðar). ' +
    'Listinn, þrepin og tenglarnir virka — „Tilbúið í vinnslu", „Gert" og athugasemdir eru læst svo ekkert týnist.</div>';

  function listi() {
    tryggja(false);
    if (!S.d) return S.villa ? '<p class="err">Náði ekki í kröfumálin: ' + esc(S.villa) + '</p>'
      : '<div class="empty"><span class="coin" aria-hidden="true"></span>Fer yfir sölur, Payday-spegilinn og skýrslur…</div>';
    const d = S.d, mal = d.mal.filter(m => !LOKAD[stadaMals(m)]);
    const bida = mal.filter(m => stadaMals(m) === 'i_yfirferd_agnars');
    const rest = mal.filter(m => stadaMals(m) !== 'i_yfirferd_agnars');
    const med = rest.filter(m => m.upphaed > 0), an = rest.filter(m => !(m.upphaed > 0));
    const raun = summa(mal.filter(m => !m.aaetlad)), aaetl = summa(mal.filter(m => m.aaetlad));
    const iVinnslu = mal.filter(m => /^(tilbuid_i_vinnslu|i_vinnslu)$/.test(stadaMals(m))).length;
    let h = (d.taflaVantar ? bannHtml() : '') +
      (S.villa ? '<p class="err">Síðasta uppfærsla mistókst — sýni eldri gögn: ' + esc(S.villa) + '</p>' : '') +
      (d.vantar.length ? '<p class="err">Hluti gagnanna náðist ekki, listinn er ófullur: ' + esc(d.vantar.join(' · ')) + '</p>' : '') +
      '<div class="kboxes">' +
        kb('Til að ná inn', mal.length + ' mál', kr(raun) + (aaetl ? ' + ≈ ' + kr(aaetl) + ' áætlað' : '')) +
        kb('Bíða þín', bida.length, kr(summa(bida))) +
        kb('Í vinnslu', iVinnslu, 'hjá Claude') +
        kb('Í innheimtu', d.iInnheimtu.length, kr(d.iInnheimtu.reduce((a, s) => a + (+s.samtals || 0), 0)) + ' · ekki á gjalddaga') +
      '</div>';
    if (bida.length) h += '<div class="sect">Bíða yfirferðar þinnar — krafan situr ósend (' + bida.length + ')</div>' + bida.map(rodHtml).join('');
    if (S.rod === 'tegund') {
      h += TEG_ROD.map(t => ({ t, l: rest.filter(m => m.tegund === t) })).filter(g => g.l.length).sort((a, b) => summa(b.l) - summa(a.l)).map(g => {
        const allt = S.opinTegund === g.t, synd = allt ? g.l : g.l.slice(0, 8);
        return '<div class="sect">' + esc(TEG[g.t].t) + ' · ' + g.l.length + ' · ' + kr(summa(g.l)) + '</div>' + synd.map(rodHtml).join('') +
          (g.l.length > synd.length ? '<div class="more"><button type="button" class="btn iv sm" data-kv="tegund-allt" data-t="' + g.t + '">Sýna öll ' + g.l.length + '</button></div>' : '');
      }).join('');
    } else {
      h += '<div class="sect">Stærst fyrst (' + med.length + ')</div>' + med.slice(0, S.synd).map(rodHtml).join('') +
        (med.length > S.synd ? '<div class="more"><button type="button" class="btn iv sm" data-kv="fleiri">Sýna fleiri · ' + (med.length - S.synd) + ' eftir</button></div>' : '');
      if (an.length) {
        h += '<div class="sect">Án upphæðar (' + an.length + ')</div><div class="more">' +
          TEG_ROD.map(t => [t, an.filter(m => m.tegund === t).length]).filter(x => x[1])
            .map(x => '<button type="button" class="btn iv sm" data-kv="syna-tegund" data-t="' + x[0] + '">' + esc(TEG[x[0]].l) + ' · ' + x[1] + '</button>').join('') + '</div>';
      }
    }
    if (!mal.length) h += '<div class="empty"><span class="coin" aria-hidden="true"></span>Ekkert bíður — öll mál afgreidd.</div>';
    return '<div class="kvlisti">' + h + '</div>';
  }
  function samantekt() {
    if (!S.d) return S.bid ? 'Tek saman…' : 'Stærsta upphæð fyrst';
    const mal = S.d.mal.filter(m => !LOKAD[stadaMals(m)]), bida = mal.filter(m => stadaMals(m) === 'i_yfirferd_agnars').length;
    return mal.length + ' mál · ' + kr(summa(mal.filter(m => !m.aaetlad))) + (bida ? ' · ' + bida + ' bíða þín' : '') + (S.bid ? ' · uppfæri…' : '');
  }
  function takkar() {
    return '<div class="seg sm" role="group" aria-label="Röðun forgangslista">' +
        '<button type="button" data-kv="rod" data-v="upphaed" aria-pressed="' + (S.rod === 'upphaed') + '">Stærst fyrst</button>' +
        '<button type="button" data-kv="rod" data-v="tegund" aria-pressed="' + (S.rod === 'tegund') + '">Eftir tegund</button></div>' +
      '<button type="button" class="btn iv sm" data-kv="nytt" title="Stofna mál á reikning: rangur greiðandi, krafa ekki stofnuð eða annað">+ Mál</button>' +
      '<button type="button" class="btn iv sm tog" data-kv="uppf" title="Sækja nýjustu gögn" aria-label="Uppfæra forgangslista">↻</button>';
  }

  /* ── festing í skuggarót 368: stíll, smellir á listann og lagið fyrir vinnugluggann ── */
  function festa(root) {
    if (!root) return;
    if (!root.querySelector('#kv-still')) {
      const st = document.createElement('style');
      st.id = 'kv-still';
      st.textContent = cssText();
      root.appendChild(st);
    }
    if (!root.__kvFest) {
      root.__kvFest = true;
      root.addEventListener('click', e => {
        const el = e.target && e.target.closest ? e.target.closest('[data-kv]') : null;
        if (!el || (S.lag && S.lag.contains(el))) return;
        smellaListi(el);
      });
    }
    if (!S.lag || !S.lag.isConnected || S.lag.getRootNode() !== root) {
      const lag = document.createElement('div');
      lag.className = 'kv-lag';
      lag.hidden = true;
      root.appendChild(lag);
      S.lag = lag;
      festaLag(lag);
    }
  }
  function smellaListi(el) {
    const a = el.dataset.kv;
    if (a === 'opna') { opna(el.dataset.lykill); return; }
    if (a === 'rod') { S.rod = el.dataset.v === 'tegund' ? 'tegund' : 'upphaed'; S.synd = SYND; teiknaBord(); return; }
    if (a === 'syna-tegund') { S.rod = 'tegund'; S.opinTegund = el.dataset.t; teiknaBord(); return; }
    if (a === 'tegund-allt') { S.opinTegund = el.dataset.t; teiknaBord(); return; }
    if (a === 'fleiri') { S.synd += SYND; teiknaBord(); return; }
    if (a === 'uppf') {
      tryggja(true); teiknaBord();
      // Staða reikninga úr Payday líka — 'payday-spegill' sækir listann aftur þegar hún er komin.
      if (window.PaydaySpegill) PaydaySpegill.uppfaera({ afl: true }).then(r => { if (!r.ok) toast('Staða úr Payday uppfærðist ekki: ' + (r.villa || 'óþekkt villa'), true); });
      return;
    }
    if (a === 'nytt') opnaNytt();
  }
  const rotOgLag = () => { const v = document.getElementById(VIEW_ID), r = v && v.shadowRoot; if (r) festa(r); return r; };

  /* ── vinnuglugginn: opnun og fersk gögn ── */
  const nyttGl = m => ({ m, x: null, vf: m.vf || null, bid: false, villa: '', drog: {}, busy: '', form: '', sleppaOpid: false, athStada: '' });
  function opna(lykill) {
    const m = S.d && S.d.mal.find(x => x.lykill === lykill);
    if (!m) { toast('Málið fannst ekki lengur — sæki listann aftur.', true); tryggja(true); return; }
    if (!rotOgLag()) return;
    S.gl = nyttGl(m);
    S.gl.bid = true;
    teiknaGlugga();
    saekjaGlugga();
  }
  /* ── opnun úr öðrum listum (368 „Vinna ›"): sala eða gleymd úttekt → vinnugluggi málsins ── */
  // 368 getur kallað áður en listinn hefur hlaðist: beiðnin bíður og er afgreidd þegar gögnin koma, svo „fannst ekki"
  // birtist aldrei fyrir það eitt að listinn var ekki kominn. Mál er ALDREI stofnað hér — finnist ekkert segir skýringin af hverju.
  let _bidur = null;
  function finnaSoluMal(solurId) {
    if (!S.d || solurId == null || solurId === '') return null;
    const l = S.d.mal.filter(m => m.solur_id != null && String(m.solur_id) === String(solurId));
    return l.find(m => !LOKAD[stadaMals(m)]) || l[0] || null;
  }
  function malFyrirSolu(solurId) {
    const m = finnaSoluMal(solurId);
    return m ? { lykill: m.lykill, tegund: m.tegund, stada: stadaMals(m) } : null;
  }
  const opnaSolu = solurId => beida({ teg: 'sala', id: solurId });
  const opnaGleymt = fyrirtaekiId => beida({ teg: 'gleymt', id: fyrirtaekiId });
  function beida(b) {
    if (b.id == null || b.id === '' || !rotOgLag()) return;
    // Gögn yngri en 5 mín. svara strax (flokkun málsins gæti annars verið úrelt). Finnist málið ekki í gögnum eldri en
    // 20 s er sótt aftur áður en sagt er að ekkert sé að gera.
    const aldur = Date.now() - S.at;
    if (S.d && !S.bid && aldur < MAX_ALDUR && afgreida(b, aldur < 20000)) return;
    _bidur = Object.assign({ kl: Date.now() }, b);
    toast(S.d ? 'Sæki nýjustu kröfumálin…' : 'Sæki kröfumálin — glugginn opnast eftir augnablik…');
    tryggja(true);
  }
  function afgreida(b, lokasvar) {
    const m = b.teg === 'gleymt' ? (S.d.mal.find(x => x.lykill === 'fyrirtaeki:' + b.id + ':gleymt:' + AR()) || null) : finnaSoluMal(b.id);
    if (m) { opna(m.lykill); return true; }
    if (!lokasvar) return false;
    toast(S.villa ? 'Náði ekki í nýjustu kröfumálin: ' + S.villa
      : b.teg === 'gleymt' ? 'Engin gleymd úttekt á þessum stað lengur — reikningur hefur verið gerður eða hún var rukkuð gegnum Stólpa. Ýttu á ↻ til að uppfæra listann.'
        : (S.d.utan && S.d.utan[b.id]) || 'Ekkert opið kröfumál á þessari sölu — hún er líklega greidd, bakfærð eða komin af kröfulistunum. Ýttu á ↻ til að uppfæra listann.', true);
    return true;
  }
  function vinnaBidur() {
    const b = _bidur;
    if (!b) return;
    _bidur = null;
    if (Date.now() - b.kl > 60000) return;          // svo gömul beiðni opnar ekki glugga upp úr þurru
    if (!S.d) { toast('Náði ekki í kröfumálin' + (S.villa ? ': ' + S.villa : '') + ' — reyndu aftur.', true); return; }
    afgreida(b, true);
  }
  function opnaNytt() {
    if (!rotOgLag()) return;
    S.gl = nyttGl({ lykill: '', tegund: 'annad', nytt: true, nafn: 'Nýtt mál á reikning', upphaed: 0 });
    teiknaGlugga();
  }
  async function saekjaGlugga() {
    const gl = S.gl;
    if (!gl || gl.m.nytt) return;
    const c = sb(), m = gl.m;
    gl.bid = true;
    gl.villa = '';
    try {
      if (!c) throw new Error('Engin tenging við gagnagrunn');
      const x = { idag: ymd(new Date()) };
      const rv = await c.from('krofu_verkferli').select('*').eq('mal_lykill', m.lykill).maybeSingle();
      if (rv.error) { if (taflaEkkiTil(rv.error)) x.taflaVantar = true; else throw rv.error; }
      gl.vf = rv.error ? null : (rv.data || null);
      const g = (gl.vf && gl.vf.gogn) || m.gognNy || {};
      let s = null;
      if (m.solur_id) {
        const rs = await c.from('solur').select('id,num,customer_nafn,customer_kt,customer_base_id,customer_id,samtals,status,greitt_med,paid_at,created_at,krafa_sent_at,invoiced_at,dk_invoice_id,krafa_note,is_credit,credit_of,source,linur,athugasemdir').eq('id', m.solur_id).maybeSingle();
        if (rs.error) throw rs.error;
        s = rs.data || null;
      }
      const u = g.upphaflegt || {};
      const dkId = (s && s.dk_invoice_id) || u.dk_invoice_id || null;
      const baseId = (s && s.customer_base_id) || m.customer_base_id || null, fid = (s && s.customer_id) || m.fyrirtaeki_id || null;
      const markkt = tolur(g.markkt || '');
      const tomt = Promise.resolve({ data: null, error: null });
      const [rp, rb, rf, ru, rt, rmb, rmf, rny, rsyn, rkr] = await Promise.all([
        dkId ? c.from('payday_invoices_slokk').select('payday_id,number,kt,customer_name,amount_total,created_date,due_date,final_due_date,paid_date,status,reference,updated_at').eq('payday_id', dkId).limit(1) : tomt,
        baseId ? c.from('customers_base').select('id,nafn,kennitala,netfang,simi,heimilisfang,contact_email,contact_phone').eq('id', baseId).maybeSingle() : tomt,
        fid ? c.from('fyrirtaeki').select('id,nafn,kennitala,netfang,simi,heimilisfang,customer_base_id').eq('id', fid).maybeSingle() : tomt,
        baseId ? c.from('felag_umsjonarpostur').select('email_id,sender_name,sender_email,subject,received_at').eq('customer_base_id', baseId).eq('fra_okkur', false).order('received_at', { ascending: false }).limit(5) : tomt,
        (m.tegund === 'senda_krofu' && s && s.customer_kt && +s.samtals) ? c.from('solur').select('id,num,samtals,krafa_sent_at,customer_kt,status,is_credit').eq('customer_kt', s.customer_kt).eq('samtals', s.samtals).neq('id', s.id).not('krafa_sent_at', 'is', null).limit(5) : tomt,
        markkt.length === 10 ? c.from('customers_base').select('id,nafn,kennitala').or('kennitala.eq.' + ktBirt(markkt) + ',kennitala.eq.' + markkt).limit(5) : tomt,
        markkt.length === 10 ? c.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,customer_base_id').or('kennitala.eq.' + ktBirt(markkt) + ',kennitala.eq.' + markkt).is('deleted_at', null).limit(10) : tomt,
        (m.tegund === 'gleymt' && fid) ? c.from('solur').select('id,num,samtals,created_at,krafa_sent_at,invoiced_at,dk_invoice_id,status').eq('customer_id', fid).gte('created_at', AR() + '-01-01').neq('status', 'void').order('created_at', { ascending: false }).limit(3) : tomt,
        (m.tegund === 'gleymt' && fid) ? c.from('v_gleymt_ad_rukka_uttekt').select('fyrirtaeki_id').eq('fyrirtaeki_id', fid).limit(1) : tomt,
        s ? c.from('solur').select('id,num').eq('is_credit', true).eq('credit_of', s.id).limit(3) : tomt
      ]);
      x.s = s;
      x.p = (rp.data && rp.data[0]) || null;
      x.kunni = rb.data || null;
      x.stadur = rf.data || null;
      x.umsjon = ru.data || [];
      x.tvifari = m.tegund === 'senda_krofu' ? ((rt.data || []).find(t => !t.is_credit && t.status !== 'void') || null) : undefined;
      x.markkt = markkt;
      x.markBase = markkt.length === 10 ? ((rmb.data || [])[0] || null) : undefined;
      x.markStadir = rmf.data || [];
      x.nySala = (rny.data || [])[0] || null;
      x.iSyn = m.tegund === 'gleymt' ? !!((rsyn.data || [])[0]) : undefined;
      x.kreditfaert = !!(s && (s.is_credit || (rkr.data || []).length));
      x.vantar = [rp, rb, rf, ru, rt, rmb, rmf, rny, rsyn, rkr].filter(r => r && r.error).map(r => r.error.message);
      // Gögn sem vantar mega aldrei líta út eins og „í lagi": ✓ verður „… óvíst".
      if (rt.error) x.tvifari = undefined;
      if (rmb.error) x.markBase = undefined;
      if (rsyn.error) x.iSyn = undefined;
      gl.x = x;
    } catch (e) {
      gl.villa = (e && e.message) || String(e);
      skraVillu('krofumal_gluggi', m.lykill + ': ' + gl.villa);
    }
    gl.bid = false;
    if (S.gl === gl) teiknaGlugga();
  }
  async function finnaSolu() {
    const gl = S.gl;
    if (!gl || !gl.m.nytt || gl.busy) return;
    const d = tolur(gl.drog.n_num);
    gl.nyttVilla = '';
    gl.nyttSala = null;
    gl.x = null;
    if (!d) { gl.nyttVilla = 'Sláðu inn reikningsnúmer, t.d. R-000406.'; teiknaGlugga(); return; }
    const num = 'R-' + d.slice(-6).padStart(6, '0'), c = sb();
    if (!c) { gl.nyttVilla = 'Engin tenging við gagnagrunn.'; teiknaGlugga(); return; }
    gl.busy = 'finna';
    teiknaGlugga();
    try {
      const r = await c.from('solur').select('id,num,customer_nafn,customer_kt,customer_base_id,customer_id,samtals,status,greitt_med,paid_at,created_at,krafa_sent_at,invoiced_at,dk_invoice_id,krafa_note,is_credit,credit_of,source,linur').eq('num', num).limit(5);
      if (r.error) throw r.error;
      const s = (r.data || []).find(x => !x.is_credit) || null;
      if (!s) gl.nyttVilla = 'Enginn reikningur ' + num + ' fannst.';
      else {
        let p = null;
        if (s.dk_invoice_id) {
          const rp = await c.from('payday_invoices_slokk').select('payday_id,number,status,due_date,created_date').eq('payday_id', s.dk_invoice_id).limit(1);
          p = (rp.data || [])[0] || null;
        }
        gl.nyttSala = s;
        gl.x = { idag: ymd(new Date()), s, p };
      }
    } catch (e) { gl.nyttVilla = 'Leitin mistókst: ' + ((e && e.message) || e); }
    gl.busy = '';
    if (S.gl === gl) teiknaGlugga();
  }

  /* ── þrepin: sniðmát á málategund. ath: true = búið/stenst · false = stenst ekki (kerfi) / ekki enn · null = óvíst ── */
  function threp(m, x, vf) {
    const s = x.s, p = x.p, sk = (vf && vf.skref) || {}, g = (vf && vf.gogn) || m.gognNy || {}, u = g.upphaflegt || {};
    const idag = x.idag, L = [];
    const gert = id => !!(sk[id] && sk[id].gert);
    const ogreitt = s ? (!s.paid_at && !(p && (p.paid_date || p.status === 'PAID'))) : null;
    const sent = s ? merktSend(s) : null;
    const ekkiKredit = s ? !x.kreditfaert : null;
    const og = (...v) => (v.some(z => z === false) ? false : v.some(z => z == null) ? null : true);
    const kerfi = (id, titill, ath, texti, o) => L.push(Object.assign({ id, hver: 'kerfi', titill, ath, texti: texti || '' }, o || {}));
    const agnar = (id, titill, texti, o) => L.push(Object.assign({ id, hver: 'agnar', titill, ath: gert(id) ? true : null, handvirkt: true, texti: texti || '' }, o || {}));
    const vinnsla = (id, titill, texti, ath, o) => L.push(Object.assign({ id, hver: 'vinnsla', titill, ath: ath == null ? (gert(id) ? true : null) : ath, texti: texti || '' }, o || {}));
    const markmid = (id, hver, titill, ath, texti, o) => L.push(Object.assign({ id, hver, titill, ath, texti: texti || '', markmid: true }, o || {}));
    // Ný sending = salan ber annan Payday-reikning en þann upphaflega (afturkallað og sent aftur).
    const nySending = s ? (u.dk_invoice_id ? !!(s.dk_invoice_id && s.dk_invoice_id !== u.dk_invoice_id) : sent) : null;
    const afturkallad = s ? (u.dk_invoice_id ? s.dk_invoice_id !== u.dk_invoice_id : !sent) : null;
    const greiddEftir = () => markmid('greitt', 'kerfi', 'Greiðsla komin', s ? !ogreitt : null, 'Merkist sjálfkrafa þegar salan eða Payday sýnir greitt.');

    switch (m.tegund) {
      case 'itreka':
        kerfi('forathugun', 'Forathugun: ógreitt, ekki kreditfært og SENT í Payday', og(ogreitt, ekkiKredit, p ? p.status === 'SENT' : null),
          p ? 'Payday nr. ' + (p.number || '—') + ' · ' + p.status : 'Enginn Payday-reikningur fannst.');
        kerfi('gjalddagi', 'Gjalddagi liðinn', p && p.due_date ? p.due_date < idag : null,
          p && p.due_date ? 'Gjalddagi ' + dags(p.due_date) + (p.final_due_date ? ' · eindagi ' + dags(p.final_due_date) : '') + ' · ' + dagaMunur(p.due_date) + ' dagar síðan' : '');
        kerfi('spegill', 'Payday-spegillinn er nýlegur', p ? Date.now() - tStamp(p.updated_at) < 36 * 3600e3 : null,
          p ? 'Síðast samstilltur ' + klukka(p.updated_at) + ' — greiðsla síðustu klukkustunda getur vantað.' : '');
        agnar('greitt_annars', 'Athuga hvort greitt hafi verið á annan hátt', 'Samanlögð bankagreiðsla (ein millifærsla fyrir fleiri reikninga) eða greiðsla inn á annan reikning sést ekki sjálfkrafa.');
        agnar('hafa_samband', 'Hafa samband — hringja eða senda ítrekun', tengilidurTexti(x));
        vinnsla('itrekun_drog', 'Útbúa ítrekunarpóst sem drög (ekkert sent)', 'Claude skrifar ítrekun með reikningsnúmeri, upphæð og gjalddaga og skilar henni sem drögum.');
        agnar('senda_itrekun', 'Senda ítrekunina', 'Lokasending er alltaf þín.');
        greiddEftir();
        break;

      case 'senda_krofu': {
        const d = s ? tolur(s.customer_kt) : '';
        kerfi('ekki_void', 'Salan er ekki ógild (void)', s ? s.status !== 'void' : null, 'Vörður 1 í payday-push: ógild sala fer aldrei í kröfu (409).');
        kerfi('base', 'Salan er tengd kúnna (customer_base_id)', s ? !!s.customer_base_id : null, 'Vörður 2: án tengingar neitar payday-push (422).');
        kerfi('linur', 'Reikningurinn ber línur', s ? hefurLinur(s) : null, s ? (Array.isArray(s.linur) ? s.linur.length : 0) + ' línur — auður reikningur er stöðvaður í 233/254.' : '');
        kerfi('kt', 'Kennitala greiðanda gild', s ? ktGild(d) : null, s ? (d ? 'kt. ' + ktBirt(d) : 'Engin kennitala á sölunni') + (d === '9999999999' ? ' — staðgreiðslukúnni fær ekki kröfu' : '') : '');
        kerfi('tvitak', 'Engin tvírukkun', x.tvifari === undefined ? null : !x.tvifari,
          x.tvifari ? 'Möguleg tvírukkun: ' + (x.tvifari.num || '#' + x.tvifari.id) + ' var send ' + dags(x.tvifari.krafa_sent_at) + ' á sömu kennitölu með sömu upphæð.'
            : 'Engin önnur send sala á sömu kennitölu með sömu upphæð. Vörður 3 ber líka saman línurnar við sendingu.');
        agnar('yfirfara', 'Fara yfir skýrslu og reikning', 'Opnaðu söluna í Kröfuyfirliti (📤 Ósendar) og berðu reikninginn við úttektarskýrsluna.');
        vinnsla('prufa', 'Prufukeyrsla í payday-push (dry-run) — ekkert sent', 'Claude keyrir dry:true og skráir afhendingu, netfang og hvort skýrslan fylgi.');
        markmid('senda', 'agnar', 'Senda kröfuna úr Kröfuyfirliti', s ? sent : null, 'Lokasending er alltaf þín.');
        break;
      }

      case 'payday_drog':
        kerfi('forathugun', 'Forathugun: aðeins drög í Payday og ógreitt', og(p ? p.status === 'DRAFT' : null, ogreitt),
          p ? 'Payday ' + p.status + ' — kúnninn hefur ekki fengið reikninginn og engin krafa er í banka.' : 'Enginn Payday-reikningur fannst.');
        kerfi('sala', 'Salan er final, ekki ógild og tengd kúnna', s ? (s.status === 'final' && !!s.customer_base_id) : null,
          s ? 'Staða ' + s.status + (s.customer_base_id ? '' : ' · customer_base_id vantar') : '');
        kerfi('dagsetning', 'Gjalddagi dróganna er ekki liðinn', p && p.due_date ? p.due_date >= idag : null,
          p && p.due_date ? 'Gjalddagi dróganna ' + dags(p.due_date) + (p.due_date < idag ? ' er LIÐINN — uppfærðu gjalddaga og eindaga í Payday áður en sent er.' : '') : '');
        agnar('yfirfara', 'Opna drögin í Payday og yfirfara línur og dagsetningar', 'Drög fá ekki Payday-númer fyrr en þau eru send. Leitaðu eftir ' + ((s && s.num) || 'reikningsnúmerinu') + '.');
        markmid('senda', 'agnar', 'Senda drögin úr Payday', p ? p.status !== 'DRAFT' : null, 'Lokasending er alltaf þín. Spegillinn sýnir SENT eftir næstu samstillingu.');
        break;

      case 'krafa_ekki_stofnud': {
        const leid = sk._leid && sk._leid.v;
        const utan = l => !!leid && leid !== l;
        kerfi('forathugun', 'Forathugun: ógreitt, ekki kreditfært og SENT í Payday', og(ogreitt, ekkiKredit, s ? s.status !== 'void' : null, p ? p.status === 'SENT' : (s && !sent ? true : null)),
          p ? 'Payday nr. ' + (p.number || '—') + ' · ' + p.status + (p.due_date ? ' · gjalddagi ' + dags(p.due_date) : '') : (s && !sent ? 'Salan er ósend (afturkölluð).' : ''));
        kerfi('heimild', '„Krafa stofnuð" = Nei', true, g.heimild || 'Skráð handvirkt.');
        L.push({ id: '_leid', hver: 'agnar', titill: 'Velja leið', ath: leid ? true : null, leidVal: leid || '',
          texti: '1) Stofna bankakröfu á reikninginn í Payday. 2) Senda greiðsluupplýsingar í NÝJUM pósti. 3) Afturkalla og senda aftur — ný krafa stofnast með nýjum reikningi.' });
        agnar('stofna_payday', 'Stofna bankakröfu á reikninginn í Payday', 'Payday nr. ' + ((p && p.number) || u.payday_nr || '—') + '. Merktu „Gert" þegar krafan er komin.', { leid: 'payday', utan: utan('payday') });
        agnar('senda_uppl', 'Senda greiðsluupplýsingar í nýjum pósti', 'Til: ' + (vidtakandi(x) || '(netfang vantar)') + ' — textinn er tilbúinn hér til hliðar. Lokasending er alltaf þín.', { leid: 'uppl', utan: utan('uppl') });
        vinnsla('afturkalla', '⚠ Afturkalla reikning og kröfu í Payday (payday-push cancel) og lesa til baka',
          'Villa í síðustu skrifun (clearSaleInvoiced) er hunsuð í payday-push — salan er því lesin aftur og staðfest að sent-merkin séu farin.', afturkallad || null, { vardur: true, leid: 'endursenda', utan: utan('endursenda') });
        markmid('osend', 'kerfi', 'Salan situr ÓSEND í Kröfuyfirliti', s ? ((afturkallad && !sent) || nySending ? true : null) : null, 'Þá bíður hún yfirferðar þinnar.', { leid: 'endursenda', utan: utan('endursenda') });
        markmid('senda_aftur', 'agnar', 'Fara yfir og senda aftur — ný bankakrafa stofnast', nySending, 'Lokasending er alltaf þín.', { leid: 'endursenda', utan: utan('endursenda') });
        greiddEftir();
        break;
      }

      case 'faera_kt': {
        const mk = tolur(g.markkt);
        const til = x.markBase === undefined ? null : !!x.markBase;
        const uppfaert = s && mk ? (tolur(s.customer_kt) === mk && (!x.markBase || s.customer_base_id === x.markBase.id)) : null;
        kerfi('markkt', 'Kennitala nýs greiðanda gild', mk ? ktGild(mk) : false, mk ? 'kt. ' + ktBirt(mk) + (g.marknafn ? ' · ' + g.marknafn : '') : 'Skráðu kennitölu nýs greiðanda hér til hliðar.');
        kerfi('forathugun', 'Forathugun: ógreitt, final, ekki kreditfært, Payday SENT eða DRAFT',
          og(ogreitt, ekkiKredit, s ? s.status === 'final' : null, s ? (sent && !afturkallad ? (p ? (p.status === 'SENT' || p.status === 'DRAFT') : false) : true) : null),
          [s ? 'Staða ' + s.status : '', p ? 'Payday nr. ' + (p.number || '—') + ' · ' + p.status : (s && !sent ? 'krafan þegar afturkölluð' : 'enginn Payday-reikningur')].filter(Boolean).join(' · '));
        kerfi('markfelag', til === false ? 'Nýi greiðandinn er EKKI til í kúnnaskrá' : 'Nýi greiðandinn er til í kúnnaskrá', til,
          x.markBase ? x.markBase.nafn + ' · #' + x.markBase.id : til === false ? 'Leiðin „stofna félag fyrst": næsta þrep stofnar greiðandann áður en nokkuð er afturkallað.' : '');
        if (til === false || gert('stofna_felag')) vinnsla('stofna_felag', 'Stofna greiðandann í kúnnaskrá (customers_base)', 'Nafn og heimilisfang úr fyrirtækjaskrá. Ekkert er afturkallað fyrr en félagið er til.', til === true ? true : null);
        vinnsla('afturkalla', '⚠ Afturkalla kröfu og reikning í Payday (payday-push cancel) og lesa til baka',
          'Villa í síðustu skrifun (clearSaleInvoiced) er hunsuð í payday-push — salan er því lesin aftur og staðfest að dk_invoice_id, invoiced_at og krafa_sent_at séu tóm.', afturkallad || null, { vardur: true });
        vinnsla('uppfaera_solu', '⚠ Uppfæra söluna: kennitala, nafn, customer_base_id, customer_id og athugasemd — lesa til baka',
          'customer_base_id er skrifað BEINT: söluritillinn (142) vistar það ekki. Staðurinn (customer_id) velst eftir kennitölu nýja greiðandans.', uppfaert || null, { vardur: true });
        markmid('osend', 'kerfi', 'Salan situr ÓSEND í Kröfuyfirliti', s ? ((uppfaert && !sent) || (uppfaert && nySending) ? true : null) : null, 'Þá bíður hún yfirferðar þinnar.');
        markmid('senda', 'agnar', 'Fara yfir skýrslu og reikning og senda á nýja greiðandann', s && mk ? !!(nySending && uppfaert) : null, 'Lokasending er alltaf þín.');
        break;
      }

      case 'gleymt': {
        const gg = m.gleymt || {}, v = m.vidmid;
        kerfi('skyrsla', 'Úttektarskýrsla ' + AR() + ' skráð á staðnum', true,
          [gg.skyrsla_dags ? (/-01-01$/.test(gg.skyrsla_dags) ? 'Skýrsla ársins (dagsetning óskráð)' : 'Dagsett ' + dags(gg.skyrsla_dags)) + ' · ' + (gg.skyrslur || 1) + (gg.skyrslur > 1 ? ' skýrslur' : ' skýrsla') : '',
            gg.skodun_dags ? 'Skoðun ' + skodunTexti(gg) + (gg.skodun_heimild === 'skyrsla' ? '' : ' (mánuður úr tækjaskrá)') : ''].filter(Boolean).join(' · '));
        kerfi('enginn_reikningur', 'Enn enginn reikningur ' + AR() + ' — á stað, kúnna, systurstað né í Stólpa', x.iSyn === undefined ? null : x.iSyn,
          x.iSyn === false ? 'Staðurinn er horfinn úr v_gleymt_ad_rukka_uttekt — reikningur eða sala hefur bæst við, eða úttektin var rukkuð gegnum Stólpa (fyrri eigendur).'
            : 'Sama regla og „Gleymst að rukka?" (v_gleymt_ad_rukka_uttekt).');
        kerfi('upphaed', 'Upphæð áætluð út frá fyrri reikningi', v ? true : null,
          v ? '≈ ' + kr(v.amount) + ' — ' + (v.invoice_number || 'reikningur') + ' (' + (v.doc_date ? dags(v.doc_date) : v.year) + ', af ' + v.af + '). Stólpa-reikningur er aðeins verðviðmið, aldrei krafa.'
            : 'Enginn fyrri reikningur fannst — verðleggja þarf eftir tækjafjölda skýrslunnar.');
        agnar('stadfesta', 'Staðfesta að verkið sé óreikningsfært', 'T.d. ekki greitt á staðnum, ekki á samningi annars greiðanda og ekki hluti af öðrum reikningi.');
        vinnsla('reikningur', 'Gera sölu (reikning) úr skýrslunni — endar ósend í Kröfuyfirliti', 'Línur eftir tækjafjölda skýrslunnar, sama leið og úttektarflæðið. Ekkert sent.', x.nySala ? true : null);
        markmid('senda', 'agnar', 'Fara yfir skýrslu og reikning og senda', x.nySala ? merktSend(x.nySala) : null,
          x.nySala ? 'Sala ' + (x.nySala.num || '') + ' · ' + kr(x.nySala.samtals) + ' · ' + dags(x.nySala.created_at) : 'Lokasending er alltaf þín.');
        break;
      }

      case 'greitt_sidar':
        kerfi('forathugun', 'Forathugun: drög, ógreidd, „greitt síðar", línur til staðar',
          s ? ((s.status === 'drog' && !s.paid_at && s.greitt_med === 'greitt_sidar' && hefurLinur(s)) || s.greitt_med === 'reikningur') : null,
          s ? 'Staða ' + s.status + ' · ' + (Array.isArray(s.linur) ? s.linur.length : 0) + ' línur · ' + dagaMunur(s.created_at) + ' dagar' : '');
        agnar('hvernig', 'Staðfesta hvernig kúnninn greiðir', 'Reikningur (krafa í heimabanka) · kort eða reiðufé við afhendingu · þegar greitt.');
        vinnsla('i_reikning', 'Færa í reikning — AÐEINS í þessa átt (greitt síðar → reikningur)',
          'Um „→ Í kröfu" í Kröfuyfirliti (166), eina skrifleiðina á greiðslumátann. Salan endar ósend í Kröfuyfirliti. Aldrei til baka.', s ? (s.greitt_med === 'reikningur' || null) : null);
        markmid('senda', 'agnar', 'Fara yfir og senda kröfuna', s ? (sent || !!s.paid_at) : null, 'Lokasending er alltaf þín.');
        break;

      case 'aud_sala':
        kerfi('forathugun', 'Forathugun: salan er final eða sótt', s ? ['final', 'sott', 'void'].indexOf(s.status) >= 0 : null,
          s ? 'Staða ' + s.status + ' · ' + kr(s.samtals) + (s.paid_at ? ' · greidd ' + dags(s.paid_at) : ' · ógreidd') : '');
        agnar('finna', 'Finna hvað var selt', 'Verkbeiðnir ' + ((s && s.num) || '') + '-V…, úttektarskýrsla eða kvittun.');
        agnar('akvordun', 'Ákveða: bæta við línum EÐA ógilda (tvítak eða prufa)', 'Skráðu ákvörðunina í athugasemd svo vinnslan viti hvort.');
        markmid('laga', 'vinnsla', 'Laga söluna samkvæmt ákvörðun og lesa til baka', s ? (hefurLinur(s) || s.status === 'void') : null,
          'Söluritillinn opnast aðeins á ósendri sölu; annars er lagað beint og lesið til baka.');
        break;

      case 'stadfesta_greidslu': {
        const reikn = !!(s && s.greitt_med === 'reikningur');
        kerfi('forathugun', 'Forathugun: final og ekki kredit', s ? (s.status === 'final' && !s.is_credit) : null,
          s ? 'Greiðslumáti ' + (s.greitt_med || '—') + ' · ' + dags(s.created_at) + ' · ' + kr(s.samtals) : '');
        if (reikn) kerfi('payday_greitt', 'Payday segir greitt', p ? !!(p.paid_date || p.status === 'PAID') : null, p && p.paid_date ? 'Greitt ' + dags(p.paid_date) + ' samkvæmt Payday.' : '');
        agnar('bera_vid', reikn ? 'Staðfesta greiðsluna í banka eða Payday' : (s && s.greitt_med === 'kort' ? 'Bera við kortauppgjör dagsins ' : 'Bera við kassauppgjör dagsins ') + dags(s && s.created_at),
          reikn ? 'Samstillingin (payday-sync-paid) ætti að merkja söluna — athugaðu hvort hún hafi keyrt.' : 'Kvittun eða færsla á að vera til fyrir ' + kr(s && s.samtals) + '.');
        markmid('merkja', 'vinnsla', 'Merkja greitt (paid_at = greiðsludagur)', s ? (s.paid_at ? true : null) : null, 'Sama leið og „✓ Merkja greitt" í Kröfuyfirliti (🔍 Sést hvergi).');
        break;
      }

      default:
        L.push({ id: 'lysing', hver: 'agnar', titill: 'Lýsa hvað þarf að gera', ath: (m.astaeda || g.texti || (vf && vf.athugasemd)) ? true : null,
          texti: m.astaeda || g.texti || 'Skrifaðu lýsingu í athugasemd.' });
        vinnsla('vinna', 'Vinna málið samkvæmt lýsingu', 'Claude skráir hvað var gert í athugasemd.');
        agnar('yfirfara', 'Yfirfara og loka', 'Lokasending er alltaf þín.');
    }
    return L;
  }

  function flagg(t, sk) {
    if (t.ath === true) return ['ok', t.leidVal ? '✓ valið' : sk && sk.gert ? '✓ merkt' : '✓ sjálfgreint'];
    if (t.hver === 'kerfi' && !t.markmid) return t.ath === false ? ['nei', '✗ stenst ekki'] : ['ovist', '… óvíst'];
    if (t.hver === 'agnar') return ['agnar', '⏳ bíður Agnars'];
    if (t.hver === 'vinnsla') return ['vinnsla', '🤖 vinnsla'];
    return ['bid', 'Ekki enn'];
  }
  function threpHtml(t, i, gl, lok) {
    const sk = gl.vf && gl.vf.skref && gl.vf.skref[t.id];
    const f = flagg(t, sk);
    const hver = t.hver === 'kerfi' ? 'Kerfið athugar' : t.hver === 'agnar' ? 'Agnar' : 'Claude · vinnsla';
    const merkt = sk && sk.gert ? ' · ' + esc(sk.af || '') + ' ' + esc(dags(sk.kl)) : '';
    const leidir = t.id === '_leid' ? '<div class="seg sm kv-leidir" role="group" aria-label="Leið">' + Object.keys(LEIDIR).map(k =>
      '<button type="button" data-kv="leid" data-v="' + k + '" aria-pressed="' + (t.leidVal === k) + '"' + (lok ? ' disabled' : '') + '>' + esc(LEIDIR[k]) + '</button>').join('') + '</div>' : '';
    const merkja = t.handvirkt && !(t.ath === true && !(sk && sk.gert))
      ? '<label class="kv-merk"><input type="checkbox" data-kv="merkja" data-id="' + esc(t.id) + '"' + (sk && sk.gert ? ' checked' : '') + (lok ? ' disabled' : '') + '> Gert</label>' : '';
    return '<li class="kv-li f-' + f[0] + (t.vardur ? ' vardur' : '') + (t.utan ? ' utan' : '') + '" data-threp="' + esc(t.id) + '">' +
      '<span class="kv-nr" aria-hidden="true">' + (i + 1) + '</span>' +
      '<div class="kv-lt"><div class="kv-lh"><b>' + esc(t.titill) + '</b><span class="kvf ' + f[0] + '">' + f[1] + merkt + '</span></div>' +
        (t.texti ? '<p>' + esc(t.texti) + '</p>' : '') + leidir +
        '<div class="kv-lf"><span class="kv-hver">' + hver + '</span>' +
          (t.leid ? '<span class="kv-leid">' + esc(LEIDIR[t.leid]) + (t.utan ? ' · önnur leið' : '') + '</span>' : '') + merkja + '</div></div></li>';
  }
  function hindrunVinnslu(m, x, vf) {
    if (!x) return 'Bíddu — gögn málsins eru enn að hlaðast.';
    if (m.tegund === 'faera_kt' && !ktGild(tolur(((vf && vf.gogn) || m.gognNy || {}).markkt))) return 'Skráðu gilda kennitölu nýs greiðanda áður en málið fer í vinnslu.';
    return '';
  }

  function afHverju(m, x, vf) {
    const s = x.s, p = x.p, g = (vf && vf.gogn) || {};
    switch (m.tegund) {
      case 'itreka': return 'Reikningurinn var sendur ' + (dags((s && s.krafa_sent_at) || (p && p.created_date)) || '(óþekkt)') + ' og gjalddaginn ' + (p && p.due_date ? dags(p.due_date) + ' er liðinn (' + dagaMunur(p.due_date) + ' dagar)' : 'er liðinn') + '. Ekkert hefur verið greitt.';
      case 'senda_krofu': return 'Reikningurinn var gerður ' + dags(s && s.created_at) + ' en hefur aldrei farið í kröfu — kúnninn veit ekki af honum.';
      case 'payday_drog': return 'Salan er merkt send, en reikningurinn er aðeins DRAFT í Payday: kúnninn hefur ekki fengið hann og engin krafa er í banka.';
      case 'krafa_ekki_stofnud': return 'Reikningurinn var sendur en bankakrafa stofnaðist ekki („Krafa stofnuð" = Nei). Greiðandinn sér enga kröfu í heimabanka og getur ekki greitt — algengt hjá húsfélögum í umsjón (Eignaumsjón: „engin krafa").';
      case 'faera_kt': return 'Reikningurinn á að greiðast af öðrum aðila en honum var sendur á' + (g.markkt ? ' (kt. ' + ktBirt(g.markkt) + (g.marknafn ? ', ' + g.marknafn : '') + ')' : '') + '. Hann er afturkallaður, greiðandinn færður á sölunni og krafan send aftur á rétta kennitölu.' + (g.texti ? ' ' + g.texti : '');
      case 'gleymt': return 'Úttektarskýrsla ' + AR() + ' er skráð á staðnum en enginn reikningur — hvorki á staðnum, kúnnanum né systurstað á sömu kennitölu — og úttektin var ekki rukkuð gegnum Stólpa (fyrri eigendur).';
      case 'greitt_sidar': return 'Sala í „greitt síðar" síðan ' + dags(s && s.created_at) + ' (' + dagaMunur(s && s.created_at) + ' dagar). Hún er hvorki greidd né komin í kröfu.';
      case 'aud_sala': return 'Salan er ' + ((s && s.status) || '') + ' en ber engar línur. Reikningur yrði auður — verðirnir í 233/254 stöðva sendingu, en upphæðin sem átti að rukka er óþekkt.';
      case 'stadfesta_greidslu': return s && s.greitt_med === 'reikningur'
        ? 'Payday segir reikninginn greiddan' + (p && p.paid_date ? ' ' + dags(p.paid_date) : '') + ' en salan er ekki merkt greidd.'
        : 'Sala greidd með ' + (s && s.greitt_med === 'kort' ? 'korti' : 'reiðufé') + ' ' + dags(s && s.created_at) + ' en aldrei merkt greidd (paid_at vantar) — tekjur og uppgjör stemma ekki.';
      default: return m.astaeda || g.texti || 'Handvirkt mál.';
    }
  }
  function tengilidurTexti(x) {
    const k = x.kunni || {}, st = x.stadur || {}, e = (x.umsjon || [])[0], l = [];
    const net = k.netfang || k.contact_email || st.netfang, simi = k.simi || k.contact_phone || st.simi;
    if (net) l.push('Netfang: ' + net);
    if (simi) l.push('Sími: ' + simi);
    if (e) l.push('Umsjónaraðili skrifaði síðast ' + dags(e.received_at) + ' (' + e.sender_email + ')');
    return l.join(' · ') || 'Engar tengiliðaupplýsingar skráðar — sjá fyrirtækið.';
  }
  function vidtakandi(x) {
    const u = (x.umsjon || []).map(e => String(e.sender_email || '').toLowerCase()).filter(Boolean);
    if (u.some(e => /@eignaumsjon\.is$/.test(e))) return 'gjaldkeri@eignaumsjon.is';
    return u.find(e => /^(reikning|gjaldker|bokhald)/.test(e)) || u[0] || (x.stadur && x.stadur.netfang) || (x.kunni && (x.kunni.netfang || x.kunni.contact_email)) || '';
  }
  function greidslutexti(m, x) {
    const s = x.s, p = x.p;
    if (!s) return '';
    const num = s.num || ('#' + s.id), L = [];
    L.push('Efni: Greiðsluupplýsingar – reikningur ' + num + ' frá Slökkvitæki ehf.', '', 'Góðan dag,', '');
    L.push('Reikningur ' + num + (p && p.number ? ' (Payday nr. ' + p.number + ')' : '') + ' frá Slökkvitæki ehf. vegna ' + (s.customer_nafn || '') +
      (s.customer_kt ? ', kt. ' + ktBirt(s.customer_kt) : '') + ', var gefinn út ' + dags((p && p.created_date) || s.krafa_sent_at || s.created_at) +
      ', en bankakrafa stofnaðist ekki og því birtist engin krafa í heimabanka.', '');
    L.push('Upphæð: ' + kr(s.samtals));
    if (p && p.due_date) L.push('Gjalddagi: ' + dags(p.due_date));
    L.push('Greiða má inn á reikning Slökkvitækis ehf.: [BANKAREIKNINGUR — fylla inn áður en sent er]', 'Kennitala móttakanda: 600508-0400', 'Skýring greiðslu: ' + num, '');
    L.push('Kær kveðja,', 'Brunahólf Slökkvitæki ehf.', 'kt. 600508-0400', 'sími 565-4080');
    return L.join('\n');
  }

  /* ── vinnuglugginn: teikning ── */
  function tenglarHtml(m, x) {
    const s = x.s, p = x.p, fid = (s && s.customer_id) || m.fyrirtaeki_id, L = [];
    if (fid) L.push('<a class="btn iv sm" href="#company/' + fid + '" data-kv="fara-fyr" data-fid="' + fid + '" title="Ctrl-smellur opnar í nýjum flipa">🏢 Fyrirtækið</a>');
    if (s) L.push('<button type="button" class="btn iv sm" data-kv="soluritill" data-id="' + s.id + '">🧾 Söluritill ' + esc(s.num || '') + '</button>');
    L.push('<button type="button" class="btn iv sm" data-kv="fara" data-view="krofu-yfirlit">📋 Kröfuyfirlit</button>');
    if (p || (s && merktSend(s)) || HANDVIRK[m.tegund]) L.push('<a class="btn iv sm" href="https://app.payday.is/is/dashboard/" target="_blank" rel="noopener" title="Payday opnast í nýjum flipa — leitaðu eftir númerinu">💳 Payday' + (p && p.number ? ' · nr. ' + esc(p.number) : '') + '</a>');
    if (x.umsjon && x.umsjon.length) L.push('<button type="button" class="btn iv sm" data-kv="fara" data-view="thjonustuver-postar">✉ Pósthólfið</button>');
    if (m.tegund === 'gleymt') L.push('<button type="button" class="btn iv sm" data-kv="fara" data-view="arsskodun">📅 Ársskoðun</button>');
    return L.join('');
  }
  function gognHtml(m, x, vf) {
    const s = x.s, p = x.p, k = x.kunni, st = x.stadur, g = (vf && vf.gogn) || {}, L = [];
    const r = (l, v) => { if (v) L.push('<div class="kvg"><span>' + esc(l) + '</span><b>' + esc(v) + '</b></div>'); };
    if (s) {
      r('Reikningur', [s.num || '#' + s.id, s.status, s.greitt_med].filter(Boolean).join(' · '));
      r('Upphæð', kr(s.samtals));
      r('Stofnaður', dags(s.created_at) + ' · ' + dagaMunur(s.created_at) + ' dagar');
      r('Sendur', s.krafa_sent_at ? klukka(s.krafa_sent_at) : merktSend(s) ? 'merktur sendur' : 'aldrei');
      r('Línur', String(Array.isArray(s.linur) ? s.linur.length : 0));
      r('Greitt', s.paid_at ? dags(s.paid_at) : '');
      r('Kröfunóta', s.krafa_note || '');
      r('Athugasemd sölu', String(s.athugasemdir || '').slice(0, 240));
    }
    if (p) {
      r('Payday', (p.number ? 'nr. ' + p.number : 'án númers') + ' · ' + p.status);
      r('Gjalddagi', p.due_date ? dags(p.due_date) + (p.final_due_date ? ' · eindagi ' + dags(p.final_due_date) : '') : '');
      r('Greitt í Payday', p.paid_date ? dags(p.paid_date) : '');
      r('Spegill samstilltur', klukka(p.updated_at));
    } else if (s && merktSend(s)) r('Payday', 'enginn reikningur í speglinum');
    if (g.upphaflegt && HANDVIRK[m.tegund]) {
      const u = g.upphaflegt;
      r('Upphaflega', [u.customer_nafn, u.customer_kt ? 'kt. ' + ktBirt(u.customer_kt) : '', u.payday_nr ? 'Payday nr. ' + u.payday_nr : ''].filter(Boolean).join(' · '));
    }
    if (k) {
      r('Greiðandi', [k.nafn, k.kennitala ? 'kt. ' + ktBirt(k.kennitala) : ''].filter(Boolean).join(' · '));
      r('Netfang', k.netfang || k.contact_email || '');
      r('Sími', k.simi || k.contact_phone || '');
    }
    if (st) r('Staður', [st.nafn, st.heimilisfang, st.netfang].filter(Boolean).join(' · '));
    else if (m.gleymt) r('Staður', [m.gleymt.nafn, m.gleymt.heimilisfang].filter(Boolean).join(' · '));
    if (m.gleymt) {
      const gg = m.gleymt;
      r('Skoðun', gg.skodun_dags ? skodunTexti(gg) + (gg.skodun_heimild === 'skyrsla' ? ' · dagsetning skýrslu' : ' · mánuður úr tækjaskrá') : 'óþekkt');
      r('Vinnublað', gg.vinnublad_id ? [gg.vinnublad_manudur || gg.vinnublad_dags || '#' + gg.vinnublad_id, VB_STODUR[gg.vinnublad_stada] || gg.vinnublad_stada].filter(Boolean).join(' · ') : 'ekki á vinnublaði');
      if (gg.stolpi_sidast_nr) r('Síðast rukkað í Stólpa', ['nr. ' + gg.stolpi_sidast_nr, dags(gg.stolpi_sidast_dags), gg.stolpi_sidast_stada === 'opid_vid_yfirtoku' ? 'opið við yfirtöku' : gg.stolpi_sidast_stada,
        kr(gg.stolpi_sidast_upphaed)].filter(Boolean).join(' · ') + ' — aðeins verðviðmið');
    }
    if (x.umsjon && x.umsjon.length) {
      L.push('<div class="kvsect">Póstur frá umsjónaraðila</div>');
      x.umsjon.slice(0, 3).forEach(e => r(dags(e.received_at), (e.sender_email || '') + ' — ' + String(e.subject || '').slice(0, 90)));
    }
    return L.join('') || '<div class="kvmn">Engin gögn.</div>';
  }
  function markHtml(gl, lok) {
    const x = gl.x, vf = gl.vf, g = (vf && vf.gogn) || gl.m.gognNy || {};
    const breyta = ((vf && vf.stada) || 'opid') === 'opid' && !lok;
    const gildi = gl.drog.markkt != null ? gl.drog.markkt : ktBirt(g.markkt || '');
    const nid = x.markkt && x.markkt.length === 10 && x.markBase !== undefined
      ? (x.markBase ? '✓ Til í kúnnaskrá: ' + x.markBase.nafn + ' (#' + x.markBase.id + ')' : '✗ Ekki til í kúnnaskrá — leiðin „stofna félag fyrst"') : '';
    return '<div class="kvsect">Nýr greiðandi</div>' +
      '<div class="kvmark"><input data-kvreitur="markkt" inputmode="numeric" autocomplete="off" value="' + esc(gildi) + '" placeholder="000000-0000" aria-label="Kennitala nýs greiðanda"' + (breyta ? '' : ' disabled') + '>' +
        (breyta ? '<button type="button" class="btn iv sm" data-kv="vista-markkt">Vista kennitölu</button>' : '') + '</div>' +
      '<span class="kvmn" data-kvktst="markkt"></span>' +
      (nid ? '<div class="kvmn' + (x.markBase ? '' : ' nei') + '">' + esc(nid) + '</div>' : '') +
      (x.markStadir && x.markStadir.length ? '<div class="kvmn">Staðir á kennitölunni: ' + esc(x.markStadir.map(f => f.nafn + ' (#' + f.id + ')').join(', ')) + '</div>' : '') +
      (g.marknafn ? '<div class="kvmn">Skráð nafn: ' + esc(g.marknafn) + '</div>' : '');
  }
  function uppljHtml(m, x) {
    if (!x.s) return '';
    return '<div class="kvsect">Greiðsluupplýsingar — tilbúinn texti (ekkert sent)</div>' +
      '<div class="kvg"><span>Til</span><b>' + esc(vidtakandi(x) || '(netfang vantar — sjá fyrirtækið)') + '</b></div>' +
      '<pre class="kvpre">' + esc(greidslutexti(m, x)) + '</pre>' +
      '<div class="kvurr"><button type="button" class="btn iv sm" data-kv="afrita" data-v="greidsla">📋 Afrita texta</button><span class="kvmn">Fylltu inn bankareikninginn áður en þú sendir.</span></div>';
  }
  function athHtml(gl, taflaVantar) {
    const vist = gl.vf ? (gl.vf.athugasemd || '') : '';
    const gildi = gl.drog.ath != null ? gl.drog.ath : vist;
    return '<div class="kvsect">Athugasemdir</div>' +
      '<textarea class="kvath" data-kvreitur="ath" rows="4" aria-label="Athugasemdir" placeholder="' + (taflaVantar ? 'Vistast ekki fyrr en taflan krofu_verkferli er til' : 'Hvað skiptir máli fyrir vinnsluna — vistast á þjóninum') + '"' + (taflaVantar ? ' disabled' : '') + '>' + esc(gildi) + '</textarea>' +
      '<div class="kvathf"><span class="kvvst"></span><span class="grow"></span><button type="button" class="btn iv sm" data-kv="vista-ath"' + (taflaVantar || gl.busy ? ' disabled' : '') + '>Vista athugasemd</button></div>';
  }
  function formHtml(gl, iNyju) {
    const d = gl.drog, teg = iNyju ? (d.f_teg || 'faera_kt') : gl.form, busy = !!gl.busy;
    const velja = iNyju ? '<label class="kvlbl">Tegund máls<select data-kvreitur="f_teg">' + ['faera_kt', 'krafa_ekki_stofnud', 'annad'].map(t =>
      '<option value="' + t + '"' + (teg === t ? ' selected' : '') + '>' + esc(TEG[t].t) + '</option>').join('') + '</select></label>' : '';
    const kt = teg === 'faera_kt' ? '<label class="kvlbl">Kennitala nýs greiðanda<input data-kvreitur="f_kt" inputmode="numeric" autocomplete="off" value="' + esc(d.f_kt || '') + '" placeholder="000000-0000"></label>' +
      '<span class="kvmn" data-kvktst="f_kt"></span><label class="kvlbl">Nafn nýs greiðanda (valfrjálst)<input data-kvreitur="f_nafn" value="' + esc(d.f_nafn || '') + '"></label>' : '';
    const textiL = teg === 'krafa_ekki_stofnud' ? 'Heimild (t.d. Payday: „Krafa stofnuð" = Nei)' : teg === 'faera_kt' ? 'Af hverju (t.d. hver á að greiða)' : 'Lýsing — hvað þarf að gera';
    return '<div class="kvform">' + velja + kt +
      '<label class="kvlbl">' + esc(textiL) + '<textarea data-kvreitur="f_texti" rows="3">' + esc(d.f_texti || '') + '</textarea></label>' +
      '<div class="kvurr"><button type="button" class="btn gold sm" data-kv="stofna" data-v="' + (iNyju ? '' : teg) + '"' + (busy ? ' disabled' : '') + '>' + (gl.busy === 'stofna' ? 'Augnablik…' : 'Stofna mál') + '</button>' +
      (iNyju ? '' : '<button type="button" class="btn iv sm" data-kv="form" data-v="">Hætta við</button>') + '</div></div>';
  }
  function urraediHtml(gl, lok) {
    const m = gl.m, s = gl.x && gl.x.s;
    if (!s) return '';
    const b = (v, txt) => '<button type="button" class="btn iv sm" data-kv="form" data-v="' + v + '" aria-pressed="' + (gl.form === v) + '"' + (lok ? ' disabled' : '') + '>' + txt + '</button>';
    return '<div class="kvsect">Önnur úrræði á þessum reikningi</div><div class="kvurr">' +
      (m.tegund !== 'faera_kt' ? b('faera_kt', '↪ Rangur greiðandi') : '') +
      (m.tegund !== 'krafa_ekki_stofnud' && merktSend(s) ? b('krafa_ekki_stofnud', '⚑ Krafa ekki stofnuð') : '') +
      b('annad', '✎ Annað mál') + '</div>' + (gl.form ? formHtml(gl, false) : '');
  }
  function nyttHtml(gl) {
    const d = gl.drog, s = gl.nyttSala;
    return '<div class="kv-nytt">' +
      '<div class="kv-afhv"><span class="kv-lbl">Nýtt mál</span><p>Stofnaðu mál á reikning sem gögnin finna ekki sjálf: rangur greiðandi, krafa sem stofnaðist ekki í banka, eða annað. Málið fer í forgangslistann og vistast á þjóninum.</p></div>' +
      '<label class="kvlbl">Reikningur (R-númer)<span class="kvmark"><input data-kvreitur="n_num" value="' + esc(d.n_num || '') + '" placeholder="R-000406" autocomplete="off">' +
        '<button type="button" class="btn iv sm" data-kv="n-finna"' + (gl.busy ? ' disabled' : '') + '>' + (gl.busy === 'finna' ? 'Leita…' : 'Finna') + '</button></span></label>' +
      (gl.nyttVilla ? '<div class="kvmn nei">' + esc(gl.nyttVilla) + '</div>' : '') +
      (s ? '<div class="kvmn">✓ ' + esc(s.num) + ' · ' + esc(s.customer_nafn || '') + ' · ' + kr(s.samtals) + ' · ' + esc(s.status || '') + (merktSend(s) ? ' · send' : ' · ósend') + (s.paid_at ? ' · greidd' : '') + '</div>' + formHtml(gl, true) : '') +
    '</div>';
  }
  function sagaHtml(vf) {
    const saga = vf && Array.isArray(vf.saga) ? vf.saga : [];
    if (!saga.length) return '';
    return '<div class="kvsect">Saga málsins</div>' + saga.slice(-12).reverse().map(h => '<div class="kvg"><span>' + esc(klukka(h.kl)) + '</span><b>' +
      (h.fra ? esc(STODUR[h.fra] || h.fra) + ' → ' : '') + esc(STODUR[h.til] || h.til || '') + (h.af ? ' · ' + esc(h.af) : '') + '</b></div>').join('');
  }
  function fotHtml(gl, st, taflaVantar) {
    if (gl.m.nytt) return '<p class="kv-fott">Málið vistast á þjóninum og birtist í forgangslistanum.</p><div class="kv-fotb"><button type="button" class="btn iv" data-kv="loka">Loka</button></div>';
    const lok = taflaVantar || !!gl.busy || !gl.x;
    const b = (cls, kv, txt, v, dis, titill) => '<button type="button" class="btn ' + cls + '" data-kv="' + kv + '"' + (v ? ' data-v="' + v + '"' : '') + (dis ? ' disabled' : '') + (titill ? ' title="' + esc(titill) + '"' : '') + '>' + txt + '</button>';
    const hindrun = gl.x ? hindrunVinnslu(gl.m, gl.x, gl.vf) : '';
    let takkar = '';
    if (st === 'opid') takkar = b('iv', 'sleppa-opna', 'Sleppa máli…', '', lok) + b('gold lg', 'stada', gl.busy === 'stada' ? 'Augnablik…' : 'Tilbúið í vinnslu', 'tilbuid_i_vinnslu', lok || !!hindrun, hindrun || 'Setur málið í röð hjá Claude. Gerir ekkert annað — ekkert er sent.');
    else if (st === 'tilbuid_i_vinnslu') takkar = b('iv', 'stada', '↩ Taka úr vinnslu', 'opid', lok);
    else if (st === 'i_yfirferd_agnars') takkar = b('iv', 'stada', '↩ Aftur í vinnslu', 'tilbuid_i_vinnslu', lok) + b('gold lg', 'stada', '✓ Ég hef sent — loka máli', 'lokid', lok);
    else if (LOKAD[st]) takkar = b('iv', 'stada', 'Opna aftur', 'opid', lok);
    const texti = taflaVantar ? 'Framvinda vistast ekki fyrr en taflan krofu_verkferli er til. Þrepin og tenglarnir virka.' : (hindrun && st === 'opid' ? hindrun : FOT_TEXTI[st]);
    return '<p class="kv-fott">' + esc(texti) + '</p>' +
      (gl.sleppaOpid && st === 'opid' ? '<div class="kv-sleppa"><input data-kvreitur="sleppa" value="' + esc(gl.drog.sleppa || '') + '" placeholder="Af hverju er málinu sleppt? (valfrjálst)">' +
        '<button type="button" class="btn iv sm" data-kv="sleppa"' + (lok ? ' disabled' : '') + '>Staðfesta — sleppa máli</button></div>' : '') +
      '<div class="kv-fotb">' + takkar + '</div>';
  }
  function gluggiHtml(gl) {
    const m = gl.m, x = gl.x, vf = gl.vf, t = TEG[m.tegund] || TEG.annad;
    const taflaVantar = !!((x && x.taflaVantar) || (S.d && S.d.taflaVantar));
    const st = (vf && vf.stada) || 'opid', lok = taflaVantar || !!gl.busy;
    const s = x && x.s, p = x && x.p, ktH = (s && s.customer_kt) || m.kt;
    const meta = [ktH ? 'kt. ' + ktBirt(ktH) : '', (s && s.num) || m.num, p ? 'Payday ' + (p.number ? 'nr. ' + p.number + ' · ' : '') + p.status : '', dags((s && s.created_at) || m.stofnad)].filter(Boolean).join(' · ');
    const upph = s ? kr(s.samtals) : m.upphaed ? (m.aaetlad ? '≈ ' : '') + kr(m.upphaed) : 'Upphæð óþekkt';
    const haus = '<header class="kv-haus"><div class="kv-hr"><span class="plate dark">Krafa</span><span class="kvt2">' + esc(m.nytt ? 'Nýtt mál' : t.t) + '</span>' +
        (m.nytt ? '' : '<span class="kvst st-' + st + '">' + esc(STODUR[st]) + '</span>') + '<span class="grow"></span>' +
        (m.nytt ? '' : '<button type="button" class="btn iv sm" data-kv="endurlesa"' + (gl.bid ? ' disabled' : '') + ' title="Lesa nýjustu stöðu af þjóninum">' + (gl.bid ? 'Les…' : '↻ Endurlesa') + '</button>') +
        '<button type="button" class="kv-x" data-kv="loka" aria-label="Loka vinnuglugga">✕</button></div>' +
      '<h2 class="kv-titill" id="kv-titill">' + esc((s && s.customer_nafn) || m.nafn) + '</h2>' +
      (m.nytt ? '' : '<div class="kv-hm"><span class="kv-upph">' + esc(upph) + '</span><span class="kv-meta">' + esc(meta) + '</span></div>') + '</header>';
    let body;
    if (m.nytt) body = (S.d && S.d.taflaVantar ? bannHtml() : '') + nyttHtml(gl);
    else if (!x) body = gl.villa ? '<p class="err">Náði ekki í málið: ' + esc(gl.villa) + '</p>' : '<div class="empty"><span class="coin" aria-hidden="true"></span>Les nýjustu stöðu málsins af þjóninum…</div>';
    else {
      body = (taflaVantar ? bannHtml() : '') +
        (gl.villa ? '<p class="err">Endurlestur mistókst — sýni síðustu stöðu: ' + esc(gl.villa) + '</p>' : '') +
        (x.vantar && x.vantar.length ? '<p class="err">Hluti gagnanna náðist ekki: ' + esc(x.vantar.join(' · ')) + '</p>' : '') +
        '<div class="kv-grid"><section class="kv-threp" aria-label="Þrep málsins">' +
          '<div class="kv-afhv"><span class="kv-lbl">Af hverju</span><p>' + esc(afHverju(m, x, vf)) + '</p></div>' +
          (VIDVORUN[m.tegund] ? '<div class="kv-vid">' + esc(VIDVORUN[m.tegund]) + '</div>' : '') +
          (m.breytt ? '<div class="kvbann">' + esc(m.breytt) + '</div>' : '') +
          '<ol class="kv-ol">' + threp(m, x, vf).map((tp, i) => threpHtml(tp, i, gl, lok)).join('') + '</ol>' +
          '<p class="kv-skyr">✓ sjálfgreint = kerfið las það úr gögnunum · ⏳ bíður Agnars · 🤖 vinnsla = Claude vinnur eftir „Tilbúið í vinnslu" · ⚠ = varið þrep, keyrt í röð og lesið til baka</p>' +
        '</section><aside class="kv-hlid" aria-label="Tenglar og gögn">' +
          '<div class="kvsect">Tenglar</div><div class="kvurr">' + tenglarHtml(m, x) + '</div>' +
          (m.tegund === 'faera_kt' ? markHtml(gl, lok) : '') +
          (m.tegund === 'krafa_ekki_stofnud' ? uppljHtml(m, x) : '') +
          '<div class="kvsect">Gögn</div>' + gognHtml(m, x, vf) +
          athHtml(gl, taflaVantar) + urraediHtml(gl, lok) + sagaHtml(vf) +
        '</aside></div>';
    }
    return '<div class="kv-bak" data-kv="bak"></div><section class="kv-gl" role="dialog" aria-modal="true" aria-labelledby="kv-titill">' +
      haus + '<div class="kv-body">' + body + '</div><footer class="kv-fot">' + fotHtml(gl, st, taflaVantar) + '</footer></section>';
  }
  // Teiknað upp á nýtt án þess að rjúfa innslátt: reitur í fókus er færður heill (gildi, bendill) inn í nýju teikninguna.
  function teiknaGlugga() {
    const gl = S.gl, lag = S.lag;
    if (!lag) return;
    if (!gl) { lag.hidden = true; lag.innerHTML = ''; return; }
    const root = lag.getRootNode(), ae = root && root.activeElement;
    const iLagi = !!(ae && lag.contains(ae));
    const halda = iLagi && ae.dataset && ae.dataset.kvreitur ? ae : null;
    // Takki í fókus (t.d. ✕ eða „Tilbúið í vinnslu") fær fókusinn aftur eftir teikningu — annars týnist hann á skjálesara og lyklaborði.
    const takki = iLagi && !halda && ae.dataset && ae.dataset.kv ? [ae.dataset.kv, ae.dataset.v || '', ae.dataset.id || ''] : null;
    const val = halda && typeof halda.selectionStart === 'number' ? [halda.selectionStart, halda.selectionEnd] : null;
    const gamla = lag.querySelector('.kv-body'), skrun = gamla ? gamla.scrollTop : 0;
    lag.innerHTML = gluggiHtml(gl);
    lag.hidden = false;
    const ny = lag.querySelector('.kv-body');
    if (ny) ny.scrollTop = skrun;
    if (halda) {
      const stadg = lag.querySelector('[data-kvreitur="' + halda.dataset.kvreitur + '"]');
      if (stadg) { stadg.replaceWith(halda); halda.focus(); if (val) { try { halda.setSelectionRange(val[0], val[1]); } catch (_) {} } }
    } else if (takki) {
      const sami = [...lag.querySelectorAll('[data-kv="' + takki[0] + '"]')].find(b => (b.dataset.v || '') === takki[1] && (b.dataset.id || '') === takki[2]);
      const x = sami && !sami.disabled ? sami : lag.querySelector('.kv-x');
      if (x) x.focus();
    } else if (!gl.fokus || !iLagi) {
      gl.fokus = true;
      const x = lag.querySelector('.kv-x');
      if (x && (!ae || !iLagi) && !gl.fokusSleppt) x.focus();
    }
    stadaAth();
    lag.querySelectorAll('[data-kvreitur="f_kt"],[data-kvreitur="markkt"]').forEach(ktStada);
  }
  function stadaAth() {
    const gl = S.gl, el = S.lag && S.lag.querySelector('.kvvst');
    if (!gl || !el) return;
    const st = gl.athStada || '';
    el.classList.toggle('villa', /^villa:/.test(st));
    el.textContent = st === 'ovistad' ? 'Óvistað — vistast þegar þú ferð úr reitnum'
      : st === 'vistar' ? 'Vista…'
      : /^vistad:/.test(st) ? 'Vistað ' + klukka(st.slice(7))
      : /^villa:/.test(st) ? 'Vistaðist ekki: ' + st.slice(6) + ' — textinn er enn hér'
      : (gl.vf && gl.vf.athugasemd ? 'Vistað á þjóninum' : '');
  }
  function ktStada(el) {
    const span = S.lag && S.lag.querySelector('[data-kvktst="' + el.dataset.kvreitur + '"]');
    if (!span) return;
    const d = tolur(el.value);
    span.textContent = !d ? '' : d.length < 10 ? 'Vantar ' + (10 - d.length) + ' tölustafi' : d.length > 10 ? 'Of margir tölustafir' : ktGild(d) ? '✓ Gild kennitala' : '✗ Ógild kennitala (vartala eða öld)';
    span.className = 'kvmn' + (d.length >= 10 && !ktGild(d) ? ' nei' : '');
  }

  /* ── skrif: AÐEINS krofu_verkferli. Lesið fyrst, skrifað skilyrt á updated_at, lesið til baka. ── */
  async function vistaVf(m, breyta) {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const r0 = await c.from('krofu_verkferli').select('*').eq('mal_lykill', m.lykill).maybeSingle();
    if (r0.error) {
      if (taflaEkkiTil(r0.error)) { if (S.d) S.d.taflaVantar = true; throw new Error('Taflan krofu_verkferli er ekki til ennþá — ekkert vistaðist.'); }
      throw r0.error;
    }
    const fyrir = r0.data || null;
    const nuv = fyrir ? { stada: fyrir.stada, skref: fyrir.skref || {}, gogn: fyrir.gogn || {}, athugasemd: fyrir.athugasemd }
      : { stada: 'opid', skref: {}, gogn: m.gognNy || {}, athugasemd: null };
    const patch = breyta(JSON.parse(JSON.stringify(nuv)), fyrir);
    if (!patch) return fyrir;
    patch.uppfaert_af = nu();
    let r;
    if (fyrir) {
      r = await c.from('krofu_verkferli').update(patch).eq('id', fyrir.id).eq('updated_at', fyrir.updated_at).select('*');
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('Málið breyttist á annarri vél á meðan — nýjasta staðan er komin á skjáinn. Reyndu aftur.');
    } else {
      const ny = Object.assign({ mal_lykill: m.lykill, tegund: m.tegund, solur_id: m.solur_id || null, customer_base_id: m.customer_base_id || null,
        fyrirtaeki_id: m.fyrirtaeki_id || null, upphaed: m.upphaed || null, gogn: m.gognNy || {} }, patch);
      r = await c.from('krofu_verkferli').insert(ny).select('*');
      if (r.error) {
        if (r.error.code === '23505') throw new Error('Önnur vél stofnaði málið á sama augnabliki — nýjasta staðan er komin á skjáinn. Reyndu aftur.');
        throw r.error;
      }
    }
    const row = (r.data || [])[0];
    if (!row) throw new Error('Vistunin skilaði engri röð — ekki staðfest.');
    if (patch.stada && row.stada !== patch.stada) throw new Error('Staðan vistaðist ekki (þjónninn segir „' + (STODUR[row.stada] || row.stada) + '").');
    if ('athugasemd' in patch && (row.athugasemd || '') !== (patch.athugasemd || '')) throw new Error('Athugasemdin vistaðist ekki eins og hún var skrifuð.');
    return row;
  }
  function uppfaeraStadbundid(row) {
    if (!row) return;
    if (S.gl && S.gl.m.lykill === row.mal_lykill) S.gl.vf = row;
    const m = S.d && S.d.mal.find(x => x.lykill === row.mal_lykill);
    if (m) m.vf = row;
    teiknaBord();
  }
  const villuTexti = e => (e && e.message) || String(e);
  async function medVistun(verk, kind, lysingVillu) {
    const gl = S.gl;
    if (!gl || gl.busy) return null;
    gl.busy = verk.busy || 'vista';
    teiknaGlugga();
    let row = null;
    try { row = await verk.run(gl); uppfaeraStadbundid(row); if (verk.ok) toast(verk.ok); }
    catch (e) {
      const msg = villuTexti(e);
      toast((lysingVillu || 'Vistaðist ekki') + ': ' + msg, true);
      skraVillu(kind, gl.m.lykill + ': ' + msg);
      if (S.gl === gl && !gl.m.nytt) { gl.busy = ''; saekjaGlugga(); }
    }
    gl.busy = '';
    if (S.gl === gl) teiknaGlugga();
    return row;
  }
  const TOAST_STODU = {
    tilbuid_i_vinnslu: 'Tilbúið í vinnslu — ekkert var sent. Láttu Claude vita.',
    opid: 'Málið er opið aftur.',
    lokid: 'Málinu er lokið.',
    sleppt: 'Málinu var sleppt.'
  };
  async function setjaStodu(til, aukatexti) {
    const gl = S.gl;
    if (!gl || gl.busy) return;
    if (til === 'tilbuid_i_vinnslu') { const h = hindrunVinnslu(gl.m, gl.x, gl.vf); if (h) { toast(h, true); return; } }
    if (!(await vistaAth())) { toast('Athugasemdin vistaðist ekki — staðan var ekki færð svo textinn tapist ekki.', true); return; }
    await medVistun({
      busy: 'stada', ok: TOAST_STODU[til] || ('Staða: ' + STODUR[til]),
      run: g => vistaVf(g.m, (nuv, fyrir) => {
        if (fyrir && (LEYFT[nuv.stada] || []).indexOf(til) < 0) throw new Error('Ekki hægt að fara úr „' + STODUR[nuv.stada] + '" í „' + STODUR[til] + '" — staðan breyttist kannski á annarri vél.');
        const p = { stada: til };
        if (aukatexti) p.athugasemd = [nuv.athugasemd, aukatexti].filter(Boolean).join('\n');
        return p;
      })
    }, 'krofu_verkferli_stada', 'Staðan vistaðist ekki');
    if (S.gl === gl && til === 'sleppt') { gl.sleppaOpid = false; delete gl.drog.sleppa; teiknaGlugga(); }
  }
  const merkjaThrep = (id, gert) => medVistun({
    busy: 'merkja',
    run: g => vistaVf(g.m, nuv => { const sk = nuv.skref || {}; if (gert) sk[id] = { gert: true, af: nu(), kl: new Date().toISOString() }; else delete sk[id]; return { skref: sk }; })
  }, 'krofu_verkferli_threp', 'Þrepið vistaðist ekki');
  const veljaLeid = v => medVistun({
    busy: 'leid', ok: 'Leið valin: ' + LEIDIR[v],
    run: g => vistaVf(g.m, nuv => { const sk = nuv.skref || {}; sk._leid = { v, af: nu(), kl: new Date().toISOString() }; return { skref: sk }; })
  }, 'krofu_verkferli_leid', 'Leiðin vistaðist ekki');
  async function vistaMarkkt() {
    const gl = S.gl;
    if (!gl) return;
    const kt = tolur(gl.drog.markkt != null ? gl.drog.markkt : '');
    if (!ktGild(kt)) { toast('Kennitalan er ekki gild — athugaðu vartöluna.', true); return; }
    const row = await medVistun({
      busy: 'markkt', ok: 'Kennitala nýs greiðanda vistuð',
      run: g => vistaVf(g.m, nuv => { if (nuv.stada !== 'opid') throw new Error('Kennitölunni er ekki breytt eftir að málið fór í vinnslu.'); const d = nuv.gogn || {}; d.markkt = kt; return { gogn: d }; })
    }, 'krofu_verkferli_markkt', 'Kennitalan vistaðist ekki');
    if (row && S.gl === gl) { delete gl.drog.markkt; saekjaGlugga(); }
  }
  // Athugasemd vistast þegar farið er úr reitnum (change/focusout), á takka, fyrir stöðubreytingu, við lokun og við pagehide.
  function vistaAth() {
    const gl = S.gl;
    if (!gl || gl.m.nytt) return Promise.resolve(true);
    const texti = gl.drog.ath;
    if (texti == null || texti === (gl.vf ? (gl.vf.athugasemd || '') : '')) return Promise.resolve(true);
    if (gl.vistarAth) return gl.vistarAth.then(() => vistaAth());
    gl.athStada = 'vistar';
    stadaAth();
    gl.vistarAth = vistaVf(gl.m, () => ({ athugasemd: texti })).then(row => {
      if (S.gl === gl) gl.vf = row;
      uppfaeraStadbundid(row);
      if (gl.drog.ath === texti) delete gl.drog.ath;
      gl.athStada = 'vistad:' + new Date().toISOString();
      return true;
    }, e => {
      gl.athStada = 'villa:' + villuTexti(e);
      skraVillu('krofu_verkferli_athugasemd', gl.m.lykill + ': ' + villuTexti(e));
      return false;
    }).then(ok => { gl.vistarAth = null; if (S.gl === gl) stadaAth(); return ok; });
    return gl.vistarAth;
  }
  async function stofnaMal(tegund) {
    const gl = S.gl;
    if (!gl || gl.busy) return;
    if (!HANDVIRK[tegund]) tegund = 'annad';
    const s = gl.x && gl.x.s;
    if (!s) { toast('Finndu reikninginn fyrst.', true); return; }
    const texti = String(gl.drog.f_texti || '').trim(), gogn = { stofnad_i: 'vinnugluggi' };
    if (tegund === 'faera_kt') {
      const kt = tolur(gl.drog.f_kt);
      if (!ktGild(kt)) { toast('Kennitala nýs greiðanda er ekki gild — athugaðu vartöluna.', true); return; }
      if (kt === tolur(s.customer_kt)) { toast('Þetta er sama kennitala og er þegar á reikningnum.', true); return; }
      gogn.markkt = kt;
      if (String(gl.drog.f_nafn || '').trim()) gogn.marknafn = String(gl.drog.f_nafn).trim();
    }
    if (tegund === 'krafa_ekki_stofnud') gogn.heimild = texti || ('Merkt í vinnuglugga ' + dags(new Date().toISOString()) + ' af ' + nu());
    if (texti) gogn.texti = texti;
    const p = gl.x.p;
    gogn.upphaflegt = { num: s.num || null, dk_invoice_id: s.dk_invoice_id || null, payday_nr: (p && p.number) || null, customer_nafn: s.customer_nafn || null,
      customer_kt: s.customer_kt || null, customer_base_id: s.customer_base_id || null, customer_id: s.customer_id || null };
    const lykill = 'solur:' + s.id + ':' + tegund + (tegund === 'annad' ? ':' + Date.now().toString(36) : '');
    const nyttM = { lykill, tegund, solur_id: s.id, customer_base_id: s.customer_base_id || null, fyrirtaeki_id: s.customer_id || null, upphaed: +s.samtals || 0, gognNy: gogn };
    const row = await medVistun({
      busy: 'stofna', ok: 'Mál stofnað: ' + TEG[tegund].t,
      run: () => vistaVf(nyttM, (nuv, fyrir) => {
        if (fyrir && !LOKAD[fyrir.stada]) throw new Error('Þetta mál er þegar til („' + STODUR[fyrir.stada] + '") — opnaðu það af listanum.');
        return { stada: 'opid', gogn, athugasemd: texti || (fyrir ? fyrir.athugasemd : null) };
      })
    }, 'krofu_verkferli_stofna', 'Málið stofnaðist ekki');
    if (!row) return;
    S.gl = null;
    teiknaGlugga();
    await endurhlada();
    opna(row.mal_lykill);
  }
  async function afrita(v) {
    const gl = S.gl;
    const txt = gl && gl.x && v === 'greidsla' ? greidslutexti(gl.m, gl.x) : '';
    if (!txt) return;
    try { await navigator.clipboard.writeText(txt); toast('Textinn er afritaður — límdu hann í nýjan póst. Ekkert var sent.'); }
    catch (_) { toast('Afritun tókst ekki í þessum vafra — veldu textann og afritaðu handvirkt.', true); }
  }
  async function loka() {
    const gl = S.gl;
    if (!gl) return;
    const ok = await vistaAth();
    if (!ok && gl.drog.ath != null) { toast('Athugasemdin vistaðist ekki — glugginn stendur opinn svo textinn tapist ekki. Reyndu aftur eða afritaðu hann.', true); return; }
    if (S.gl !== gl) return;
    S.gl = null;
    teiknaGlugga();
    teiknaBord();
  }

  /* ── atburðir á laginu ── */
  function festaLag(lag) {
    lag.addEventListener('click', e => {
      const el = e.target && e.target.closest ? e.target.closest('[data-kv]') : null;
      if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return;
      smellaGlugga(el, e);
    });
    lag.addEventListener('change', e => {
      const el = e.target;
      if (!el || !el.dataset || !S.gl) return;
      if (el.dataset.kv === 'merkja') { merkjaThrep(el.dataset.id, el.checked); return; }
      if (!el.dataset.kvreitur) return;
      S.gl.drog[el.dataset.kvreitur] = el.value;
      if (el.dataset.kvreitur === 'ath') vistaAth();
      if (el.dataset.kvreitur === 'f_teg') teiknaGlugga();
    });
    lag.addEventListener('input', e => {
      const el = e.target;
      if (!el || !el.dataset || !el.dataset.kvreitur || !S.gl) return;
      S.gl.drog[el.dataset.kvreitur] = el.value;
      if (el.dataset.kvreitur === 'ath') { S.gl.athStada = 'ovistad'; stadaAth(); }
      if (el.dataset.kvreitur === 'f_kt' || el.dataset.kvreitur === 'markkt') ktStada(el);
    });
    lag.addEventListener('focusout', e => { const el = e.target; if (el && el.dataset && el.dataset.kvreitur === 'ath') vistaAth(); });
    lag.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); loka(); return; }
      if (e.key === 'Enter' && e.target && e.target.dataset && e.target.dataset.kvreitur === 'n_num') { e.preventDefault(); finnaSolu(); }
    });
  }
  function smellaGlugga(el, e) {
    const a = el.dataset.kv, gl = S.gl;
    if (!gl) return;
    switch (a) {
      case 'loka': case 'bak': loka(); return;
      case 'stada': setjaStodu(el.dataset.v); return;
      case 'sleppa-opna': gl.sleppaOpid = !gl.sleppaOpid; teiknaGlugga(); return;
      case 'sleppa': setjaStodu('sleppt', String(gl.drog.sleppa || '').trim() ? 'Sleppt: ' + String(gl.drog.sleppa).trim() : ''); return;
      case 'endurlesa': saekjaGlugga(); teiknaGlugga(); return;
      case 'vista-ath': vistaAth(); return;
      case 'vista-markkt': vistaMarkkt(); return;
      case 'leid': veljaLeid(el.dataset.v); return;
      case 'form': gl.form = gl.form === el.dataset.v ? '' : (el.dataset.v || ''); teiknaGlugga(); return;
      case 'stofna': stofnaMal(el.dataset.v || gl.drog.f_teg || 'faera_kt'); return;
      case 'n-finna': finnaSolu(); return;
      case 'afrita': afrita(el.dataset.v); return;
      case 'soluritill':
        try { if (window.SaleEditor && SaleEditor.openById) SaleEditor.openById(+el.dataset.id); else toast('Söluritillinn (142) er ekki hlaðinn.', true); }
        catch (_) { toast('Söluritillinn opnaðist ekki.', true); }
        return;
      case 'fara':
        vistaAth();
        try { if (window.App && App.switchView) App.switchView(el.dataset.view); } catch (_) { toast('Síðan opnaðist ekki.', true); }
        return;
      case 'fara-fyr':
        if (el.tagName === 'A' && (e.ctrlKey || e.metaKey || e.shiftKey)) return;       // nýr flipi — vafrinn sér um það
        e.preventDefault();
        vistaAth();
        try {
          if (window.App && App.switchView) App.switchView('companies');
          if (window.Companies && Companies.openDetail) Companies.openDetail(+el.dataset.fid);
        } catch (_) { toast('Fyrirtækjaspjaldið opnaðist ekki.', true); }
    }
  }
  // Esc þegar fókusinn er utan lagsins (t.d. eftir smell á bakgrunn).
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !S.gl || !S.lag || S.lag.hidden) return;
    const v = document.getElementById(VIEW_ID);
    if (v && v.classList.contains('active')) loka();
  });
  // Útskolun: óvistuð athugasemd fer af stað þegar síðan hverfur.
  window.addEventListener('pagehide', () => { vistaAth(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') vistaAth(); });
  document.addEventListener('sale-edited', () => { S.at = 0; teiknaBord(); if (S.gl && !S.gl.m.nytt) saekjaGlugga(); });

  let _toastT = 0;
  function toast(msg, warn) {
    const host = rotOgLag() || document.body;
    let t = host.querySelector('.kv-toast');
    if (!t) { t = document.createElement('div'); t.className = 'kv-toast'; t.setAttribute('role', 'status'); host.appendChild(t); }
    t.textContent = msg;
    t.classList.toggle('warn', !!warn);
    t.hidden = false;
    clearTimeout(_toastT);
    _toastT = setTimeout(() => { t.hidden = true; }, warn ? 6500 : 3000);
  }

  /* ── útlit: sömu breytur og 368 (skuggarótin), aðeins nýir klasar ── */
  function cssText() {
    return [
      '.kvlisti{display:flex;flex-direction:column}',
      '.kvbann{margin:10px 14px 4px;padding:9px 12px;border:1px solid var(--g6);border-radius:5px;background:#fff8e6;font-size:12.5px;font-weight:600;line-height:1.45;color:var(--ink)}',
      '.kvbann code{font-family:var(--mono);font-size:11.5px}',
      '.kvrow{display:flex;align-items:flex-start;gap:8px;padding:9px 14px;border-top:1px solid var(--rule2)}',
      '.kvrow.kvvirk{background:rgba(241,237,228,.55);box-shadow:inset 3px 0 0 var(--g6)}',
      '.kvpick{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;padding:0;margin:0;border:0;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}',
      '.kvpick:hover .kvn{text-decoration:underline;text-decoration-color:var(--g6);text-underline-offset:3px}',
      '.kvtop{display:flex;align-items:baseline;gap:10px;min-width:0}',
      '.kvn{flex:1;min-width:0;font-size:13.5px;font-weight:700;overflow-wrap:anywhere}',
      '.kvu{flex:none;font-family:var(--mono);font-size:12.5px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--ink)}',
      '.kvs{font-size:12px;color:var(--mute);overflow-wrap:anywhere}',
      '.kvt{font-style:normal;font-family:var(--mono);font-size:9.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:1px 5px;margin-right:6px;border:1px solid var(--edge);border-radius:2px;color:var(--ink2);background:var(--well)}',
      '.kvl{font-size:12px;font-weight:600;color:var(--g8)}',
      '.kvst{flex:none;font-family:var(--mono);font-size:9.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:2px 6px;border-radius:2px;border:1px solid var(--edge);color:var(--ink2);background:var(--well);white-space:nowrap}',
      '.kvst.st-tilbuid_i_vinnslu,.kvst.st-i_vinnslu{border-color:#3a3732;background:#1c1b18;color:#e8cb7a}',
      '.kvst.st-i_yfirferd_agnars{border-color:#5a4410;background:var(--gside);color:#1b1405}',
      '.kvst.st-lokid{border-color:rgba(47,122,74,.5);color:var(--green)}',
      '.kv-lag{position:fixed;inset:0;z-index:99970}',
      '.kv-bak{position:absolute;inset:0;background:rgba(12,12,11,.58)}',
      '.kv-gl{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(90vw,1500px);height:min(90vh,1100px);display:grid;grid-template-rows:auto minmax(0,1fr) auto;' +
        'background:radial-gradient(ellipse at 50% 0%,#faf8f3 0%,#f4f1ea 55%,#ece7dc 100%);border:1px solid #000;border-radius:6px;box-shadow:0 30px 80px -20px rgba(0,0,0,.85);overflow:hidden;' +
        'color:var(--ink);font-family:var(--body);font-size:13px;line-height:1.45;text-align:left}',
      '.kv-haus{display:flex;flex-direction:column;gap:6px;padding:14px 20px;background:var(--slab);color:var(--on);border-bottom:3px solid transparent;border-image:var(--gline) 1;border-image-width:0 0 3px 0}',
      '.kv-hr{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.kvt2{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--g5)}',
      '.kv-x{width:32px;height:32px;flex:none;border:1px solid #3a3732;border-radius:4px;background:#1c1b18;color:var(--on2);font:700 14px/1 var(--body);cursor:pointer;padding:0}',
      '.kv-titill{font-family:var(--disp);font-size:26px;font-weight:800;line-height:1.15;color:var(--on);overflow-wrap:anywhere}',
      '.kv-hm{display:flex;align-items:baseline;gap:6px 16px;flex-wrap:wrap}',
      '.kv-upph{font-family:var(--disp);font-size:24px;font-weight:800;color:#f5d76e;font-variant-numeric:tabular-nums}',
      '.kv-meta{font-family:var(--mono);font-size:11.5px;letter-spacing:.06em;color:var(--on2);overflow-wrap:anywhere}',
      '.kv-body{overflow:auto;padding:16px 20px;min-height:0}',
      '.kv-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(300px,1fr);gap:18px;align-items:start}',
      '.kv-afhv{margin-bottom:10px;padding:10px 14px;border:1px solid var(--rule3);border-radius:5px;background:var(--panel);box-shadow:var(--panelsh)}',
      '.kv-afhv p{margin:4px 0 0;font-size:13.5px;line-height:1.55}',
      '.kv-lbl{font:600 10px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--g8)}',
      '.kv-vid{margin:0 0 10px;padding:9px 12px;border:1px solid rgba(181,82,42,.45);border-left:4px solid var(--terra);border-radius:4px;background:#fff7f2;color:#6b2d14;font-size:12.5px;line-height:1.5}',
      '.kv-ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}',
      '.kv-li{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;padding:10px 12px;border:1px solid var(--rule3);border-left-width:4px;border-radius:5px;background:var(--panel);box-shadow:var(--keysh)}',
      '.kv-li.f-ok{border-left-color:var(--green)}.kv-li.f-nei{border-left-color:var(--terra);background:#fff7f2}',
      '.kv-li.f-agnar{border-left-color:var(--g6)}.kv-li.f-vinnsla{border-left-color:#26241f}.kv-li.f-ovist,.kv-li.f-bid{border-left-color:var(--edge2)}',
      '.kv-li.vardur{box-shadow:var(--keysh),inset 0 0 0 1px rgba(181,82,42,.25)}.kv-li.utan{opacity:.5}',
      '.kv-nr{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--gside);color:#3e2c06;font:800 12px/1 var(--mono);box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}',
      '.kv-lh{display:flex;align-items:flex-start;justify-content:space-between;gap:6px 10px;flex-wrap:wrap}',
      '.kv-lh b{font-size:13.5px;line-height:1.35;overflow-wrap:anywhere}',
      '.kv-lt p{margin:4px 0 0;font-size:12.5px;line-height:1.5;color:var(--ink2);white-space:pre-line}',
      '.kv-lf{display:flex;align-items:center;gap:6px 14px;flex-wrap:wrap;margin-top:6px}',
      '.kv-hver{font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}',
      '.kv-merk{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;cursor:pointer}.kv-leid{font-size:11.5px;color:var(--mute)}',
      '.kv-leidir{margin-top:8px;max-width:100%;overflow-x:auto}',
      '.kvf{flex:none;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.04em;padding:2px 7px;border-radius:10px;border:1px solid var(--edge);white-space:nowrap}',
      '.kvf.ok{border-color:rgba(47,122,74,.5);color:var(--green);background:#f1f8f3}.kvf.nei{border-color:rgba(181,82,42,.55);color:var(--terra);background:#fff7f2}',
      '.kvf.agnar{border-color:#5a4410;color:#3e2c06;background:var(--gside)}.kvf.vinnsla{border-color:#000;color:#e8cb7a;background:#1c1b18}',
      '.kvf.ovist,.kvf.bid{color:var(--mute);background:var(--well)}',
      '.kv-skyr{margin:10px 0 0;font-size:11.5px;color:var(--mute)}',
      '.kv-hlid{display:flex;flex-direction:column;gap:6px;min-width:0;padding:12px 14px;border:1px solid var(--rule3);border-radius:5px;background:var(--panel);box-shadow:var(--panelsh)}',
      '.kvsect{margin-top:10px;font:600 10px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}.kvsect:first-child{margin-top:0}',
      '.kvg{display:grid;grid-template-columns:minmax(90px,.8fr) minmax(0,2fr);gap:8px;padding:2px 0;font-size:12.5px}.kvg span{color:var(--mute)}.kvg b{font-weight:600;overflow-wrap:anywhere}',
      '.kvurr{display:flex;flex-wrap:wrap;align-items:center;gap:6px}',
      '.kvath{width:100%;min-height:90px;padding:8px 10px;border:1px solid var(--edge);border-radius:4px;background:#fffdf7;box-shadow:var(--wellsh);font:13px/1.5 var(--body);color:var(--ink);resize:vertical}',
      '.kvathf{display:flex;align-items:center;gap:8px}.kvvst{font-size:11.5px;color:var(--mute)}.kvvst.villa{color:var(--terra);font-weight:600}',
      '.kvpre{margin:0;padding:10px 12px;border:1px solid var(--rule2);border-radius:4px;background:var(--well);font:12px/1.5 var(--mono);white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow:auto}',
      '.kvform{display:flex;flex-direction:column;gap:8px;margin-top:6px;padding:10px 12px;border:1px dashed var(--edge2);border-radius:5px;background:#fffdf7}',
      '.kvlbl{display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:600;color:var(--ink2)}',
      '.kvlbl input,.kvlbl select,.kvmark input,.kv-sleppa input{height:32px;padding:0 9px;border:1px solid var(--edge);border-radius:4px;background:#fff;font:13px var(--body);color:var(--ink);min-width:0}',
      '.kvlbl textarea{min-height:60px;padding:7px 9px;border:1px solid var(--edge);border-radius:4px;background:#fff;font:13px var(--body);color:var(--ink);resize:vertical}',
      '.kvmark{display:flex;align-items:center;gap:6px}.kvmark input{flex:1}',
      '.kvmn{font-size:12px;color:var(--ink2)}.kvmn.nei{color:var(--terra);font-weight:600}',
      '.kv-nytt{display:flex;flex-direction:column;gap:10px;max-width:640px}',
      '.kv-fot{display:flex;align-items:center;flex-wrap:wrap;gap:10px 16px;padding:12px 20px;border-top:1px solid var(--rule3);background:var(--strip);box-shadow:var(--stripsh)}',
      '.kv-fott{flex:1;min-width:240px;font-size:12.5px;color:var(--ink2)}',
      '.kv-fotb{display:flex;flex-wrap:wrap;gap:8px}.kv-gl .btn.gold.lg{min-width:220px}',
      '.kv-sleppa{display:flex;flex-wrap:wrap;gap:6px;width:100%}.kv-sleppa input{flex:1;min-width:200px}',
      '.kv-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:99995;max-width:min(92vw,560px);padding:11px 16px;border:1px solid #000;border-radius:5px;background:var(--slab);color:var(--on);font:600 12.5px var(--body);box-shadow:var(--slabsh)}',
      '.kv-toast.warn{border-top:3px solid var(--terra)}',
      '@media (max-width: 900px){.kv-grid{grid-template-columns:minmax(0,1fr)}}',
      '@media (max-width: 760px){.kv-gl{left:0;top:0;transform:none;width:100vw;height:100vh;height:100dvh;border-radius:0}' +
        '.kv-haus{padding:12px 14px}.kv-titill{font-size:21px}.kv-upph{font-size:20px}.kv-body{padding:12px}.kv-fot{padding:10px 12px}.kv-gl .btn.gold.lg{min-width:0;flex:1}.kvg{grid-template-columns:minmax(80px,.7fr) minmax(0,2fr)}}'
    ].join('\n');
  }

  // 372: staða reikninga uppfærð úr Payday → listinn sóttur aftur (strax á eftir sókn sem er í gangi). Aðeins ef hann hefur hlaðist.
  window.addEventListener('payday-spegill', () => { if (S.bid) S.aftur = true; else if (S.d) tryggja(true); });

  window.KrofuVinnugluggi = { version: '369b', listi, samantekt, takkar, festa, opna, opnaSolu, opnaGleymt, malFyrirSolu, uppfaera: () => { tryggja(true); teiknaBord(); } };
  console.log('[369-krofu-vinnugluggi] installed');
})();
/* === END KRÖFU-VINNUGLUGGI === */
