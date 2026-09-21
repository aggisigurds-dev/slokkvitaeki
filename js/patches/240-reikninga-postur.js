/* === REIKNINGA-PÓSTUR — invoice email helper v1 =============================
 *
 * Sjálfstæð síða (view `view-reikninga-postur`, slug `#reikninga-postur`/`#postur`)
 * sem les póst-hólfið eldklar@eldklar.is (+ bokhald@eldklar.is) BEINT úr `email_digest`
 * (sama Supabase og appið notar — engin ný tenging) og TENGIR hvern póst við
 * kúnna/reikning svo hægt sé að finna „hver spurði um hvaða reikning" á einum stað.
 *
 * Tenging (áreiðanlegust fyrst):
 *   1) R-númer í efni/texta → sala (solur.num) → kúnninn hennar.
 *   2) sendandi-netfang → kúnni (fyrirtaeki/customers_base/vidskiptavinir.netfang).
 *   3) kennitala í texta → kúnni.
 *
 * Flokkun:
 *   • „📥 Til að svara"  = innhólf (ekki frá Payday/kerfispóstum) — það sem þarf svar.
 *   • „🧾 Sendir reikningar" = afrit reikninga sem VIÐ sendum (delivery@payday.is).
 *   • „Allt" = allt.
 *
 * Aðgerðir per póst:
 *   • Opna / Saga           — opna kúnna eða hreyfingarlista (read).
 *   • ✉️ Senda              — velja reikning kúnnans, teikna PDF (patch 233
 *                             UttektInvoicePdf) og senda gegnum /api/email-send
 *                             (Resend) á hvaða netfang sem er.
 *   • ✏️ Breyta             — opna reikninginn í sölu-ritli (patch 142 SaleEditor).
 *   • 🤖 Svar               — Claude semur íslenskt uppkast að svari
 *                             (/api/postur-reply, Haiku) sem má yfirfara + senda.
 * Public API: window.ReikningaPostur = { open, reload }.
 * ========================================================================== */
(() => {
  if (window.__reikningaPosturInstalled) return;
  window.__reikningaPosturInstalled = true;

  const VIEW_ID = 'view-reikninga-postur';
  const NAV_KEY = 'reikninga-postur';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function ktDigits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function ktDashed(d) { d = ktDigits(d); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : d; }
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return '';
    return d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function relDay(iso) {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return '';
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return 'Í dag';
    if (days === 1) return 'Í gær';
    if (days < 7) return days + ' d.';
    return fmtDate(iso);
  }

  const state = {
    emails: [], loaded: false, loading: false, err: null,
    filter: 'inbox', search: '',
    custByEmail: {}, custByKt: {}, saleByNum: {},
    hidden: new Set(),   // message_ids the user has deleted/hidden (Supabase-synced)
    rules: [],           // auto-hide rules {id, rule_type:'sender'|'domain'|'subject', pattern}
    activity: new Set(), // message_ids we have replied to / sent an invoice for
    expanded: new Set(), // thread keys the user expanded
    // 21.09.2026: opnar radir. Gmail-listinn synir adeins samantekt; kunninn,
    // thradurinn og ALLAR adgerdir birtast thegar rod er opnud.
    opin: new Set(),
    tagFilter: null,     // active category-tag filter (label) or null
    merki: null,         // 21.09.2026: virk Gmail-merkjasia (nafn merkis eda STJARNA)
    meta: {},
    mal: {},              // 21.09.2026: email_digest.id -> mal a Thjonustubordinu
    svar: {},             // 21.09.2026: threadKey -> { efni, texti, msg, cls } fyrir svarreitinn i rodinni            // message_id → {manual_tag, note} (manual override + minnispunktur)
  };
  const WINDOW_DAYS = 62; // „síðustu 2 mánuðir"

  const PAYDAY_RE = /payday\.is/i;
  const NOREPLY_RE = /no[-_.]?reply|do[-_.]?not[-_.]?reply|noreply|donotreply|automated|mailer-daemon/i;
  const SYSTEM_RE = /(rsk\.is|microsoft\.com|accountprotection|google\.com|cloudflare|unimaze\.com|facebook|linkedin|apple\.com|paypal|stripe)/i;

  // ── data ──────────────────────────────────────────────────────────────────
  async function load(retry) {
    const SB = getSB();
    if (!SB) {
      // DB client may not be ready yet on a cold deep-link — wait + retry
      // (up to ~10s) instead of showing a bogus "no connection" empty state.
      if ((retry || 0) < 20) { state.loading = true; render(); setTimeout(() => load((retry || 0) + 1), 500); return; }
      state.err = 'Engin gagnabankatenging.'; render(); return;
    }
    state.loading = true; render();
    try {
      const sinceIso = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();
      // 14.09.2026: .limit(1500)/.limit(2500) hnekkja ekki 1000-raða þaki PostgREST.
      // Blaðsíðuflett; villur skila sér í sama { data, error }-formi og áður.
      const asResult = p => p.then(data => ({ data, error: null }), error => ({ data: null, error }));
      const [em, fy, cb, vd, sl, hd, rl, ac, mt, tb] = await Promise.all([
        asResult(DB.fetchAll((from, to) => SB.from('email_digest')
          .select('id,message_id,account,sender_name,sender_email,to_addresses,subject,snippet,body_preview,is_question,has_attachment,attachment_names,labels,received_at')
          .in('account', ['eldklar@eldklar.is', 'bokhald@eldklar.is'])
          // SENT-ingest (2026-07-10): okkar eigin svör mega ekki birtast sem
          // „📥 Til að svara" — innhólfið eitt á þetta borð. (231-borðið les
          // SENT sjálft fyrir svarað-greininguna.)
          .neq('folder', 'SENT')
          .gte('received_at', sinceIso)   // deep-analyse the last ~2 months only
          .order('received_at', { ascending: false })
          .order('id')
          .range(from, to))),
        asResult(DB.fetchAll((from, to) => SB.from('fyrirtaeki').select('id,nafn,kennitala,netfang').not('netfang', 'is', null).order('id').range(from, to))),
        asResult(DB.fetchAll((from, to) => SB.from('customers_base').select('id,nafn,kennitala,netfang').not('netfang', 'is', null).order('id').range(from, to))),
        asResult(DB.fetchAll((from, to) => SB.from('vidskiptavinir').select('id,nafn,kennitala,netfang').not('netfang', 'is', null).order('id').range(from, to))),
        asResult(DB.fetchAll((from, to) => SB.from('solur').select('id,num,customer_nafn,customer_kt,samtals,created_at,greitt_med,paid_at').order('created_at', { ascending: false }).order('id').range(from, to))),
        SB.from('reikninga_postur_hidden').select('message_id'),
        SB.from('reikninga_postur_rules').select('*').order('created_at', { ascending: false }),
        SB.from('reikninga_postur_activity').select('message_id'),
        SB.from('reikninga_postur_meta').select('message_id,manual_tag,note'),
        // 21.09.2026: malin a Thjonustubordinu sem eiga uppruna i posti.
        // channel_ref er `email:<email_digest.id>` - thvi er `id` sott ad ofan.
        asResult(DB.fetchAll((from, to) => SB.from('thjonustubeidni')
          .select('id,channel_ref,title,status,flokkur,assigned_to,svarad_at,archived_at')
          .eq('source', 'email').is('deleted_at', null)
          .not('channel_ref', 'is', null)
          .order('id').range(from, to))),
      ]);
      if (em.error) throw em.error;
      state.hidden = new Set(((hd && hd.data) || []).map(r => r.message_id));
      state.rules = ((rl && rl.data) || []);
      state.activity = new Set(((ac && ac.data) || []).map(r => r.message_id));
      const metaMap = {};
      ((mt && mt.data) || []).forEach(r => { metaMap[r.message_id] = { manual_tag: r.manual_tag || '', note: r.note || '' }; });
      state.meta = metaMap;
      // Vorpun email_digest.id -> mal a bordinu. RLS getur thagad her eins og
      // annars stadar; tha er kortid tomt og engin rod ber mal - hun logur
      // ekki um ad malid se ekki til.
      const malKort = {};
      ((tb && tb.data) || []).forEach(function (r) {
        const m = /^email:(\d+)$/.exec(String(r.channel_ref || ''));
        if (m) malKort[m[1]] = r;
      });
      state.mal = malKort;

      const emailMap = {}, byKt = {};
      const addCust = (res, isCompany) => (res && res.data || []).forEach(r => {
        const rec = { name: r.nafn, kt: r.kennitala, coId: isCompany ? r.id : null };
        const e = String(r.netfang || '').trim().toLowerCase();
        if (e) (emailMap[e] = emailMap[e] || []).push(rec);
        const k = ktDigits(r.kennitala);
        if (k.length === 10 && !byKt[k]) byKt[k] = rec;   // kt er einkvæmt
      });
      // fyrirtaeki first so coId (openable company page) wins.
      addCust(fy, true); addCust(cb, false); addCust(vd, false);
      // Netfang telst aðeins gild tenging ef það vísar á EINN kúnna. Deildar
      // umboðsmanna-tölvupóstar (t.d. gjaldkeri@eignaumsjon.is fyrir mörg
      // húsfélög) eru margræðir → sleppt (kt í efni ræður þá).
      const byEmail = {};
      Object.keys(emailMap).forEach(e => {
        const kts = new Set(emailMap[e].map(r => ktDigits(r.kt)).filter(Boolean));
        if (kts.size <= 1) byEmail[e] = emailMap[e][0];
      });
      state.custByEmail = byEmail; state.custByKt = byKt;

      const saleByNum = {};
      (sl.data || []).forEach(s => { if (s.num) saleByNum[String(s.num).toUpperCase()] = s; });
      state.saleByNum = saleByNum;

      // Drop content-less rows: browser-extension partial scrapes capture only a
      // sender (no subject / body / snippet) → useless „(ekkert efni)" cards. The
      // real content-bearing copy (Thunderbird bridge / cloud) stays.
      // Þráðarleit KunnaLeit þarf systkinin; hrái listinn er settur hér áður en
      // classify keyrir, því state.emails verður ekki til fyrr en eftir á.
      state._hrafyrir = em.data || [];
      state.emails = (em.data || []).map(classify)
        .filter(m => (m.subject && m.subject.trim()) || (m.body_preview && m.body_preview.trim()) || (m.snippet && m.snippet.trim()));
      state.loaded = true; state.err = null;
    } catch (e) { state.err = String((e && e.message) || e); }
    state.loading = false; render();
  }

  function classify(m) {
    const from = String(m.sender_email || '').toLowerCase();
    const hay = ((m.subject || '') + ' ' + (m.body_preview || '') + ' ' + (m.snippet || '')).toUpperCase();
    const isPayday = PAYDAY_RE.test(from);
    const isSystem = NOREPLY_RE.test(from) || SYSTEM_RE.test(from);

    // Tengja — áreiðanlegast fyrst. NB R-númer er SÍÐAST því flökku-R-númer í
    // texta/undirskrift getur bent á rangan kúnna; sendandi-netfang og kt í efni
    // eru miklu áreiðanlegri. kt/netfang tengja aðeins við RAUNverulega kúnna.
    let cust = null, matchBy = null, sale = null;
    // 1) kennitala í efni/texta → kúnni (sértækasta merki; slær deildum umboðs-
    //    netföngum við, t.d. Eignaumsjón sem sendir fyrir mörg húsfélög).
    {
      const km = hay.match(/\b(\d{6})-?(\d{4})\b/);
      if (km) { const k = km[1] + km[2]; if (state.custByKt[k]) { cust = state.custByKt[k]; matchBy = 'kennitala'; } }
    }
    // 2) sendandi-netfang → kúnni (aðeins einkvæm netföng, sjá byEmail-síuna)
    if (!cust && state.custByEmail[from]) { cust = state.custByEmail[from]; matchBy = 'netfang'; }
    // 3) R-númer → sala → kúnni (fallback)
    if (!cust) {
      const rm = hay.match(/R-0\d{5}/);
      if (rm) {
        const s = state.saleByNum[rm[0]];
        if (s) {
          sale = s;
          const k = ktDigits(s.customer_kt);
          cust = (k && state.custByKt[k]) || { name: s.customer_nafn, kt: s.customer_kt, coId: null };
          matchBy = 'reikningur';
        }
      }
    }

    // 19.09.2026 — KúnnaLeit (381) sem FALLBAKKI þegar reglurnar þrjár hér að
    // ofan bregðast. Mælt á 17 raunverulegum beiðnum: 5 -> 13 af 17. Nýju
    // leiðirnar eru nafn í texta, einkvæmt sendandalén og erfð úr þræði.
    // `state.emails` er ekki til fyrr en classify hefur keyrt á allt, svo
    // þráðarleitin fær `state._hrafyrir` — hráa listann sem verið er að flokka.
    if (!cust && window.KunnaLeit && KunnaLeit.hladid()) {
      const k = KunnaLeit.finna(m, state._hrafyrir);
      if (k) { cust = { name: k.nafn, kt: k.kt, coId: k.coId }; matchBy = k.hvernig; }
    }

    const category = isPayday ? 'sent' : 'inbox';
    const rec = { ...m, from, isPayday, isSystem, sale, cust, matchBy, category };
    rec.clean = cleanBody(m.body_preview || m.snippet || '');
    rec.threadKey = threadKey(rec);
    return rec;
  }

  // ── deep-analysis helpers: clean text + thread grouping + answered state ────
  // Strip quoted replies, forwarded headers, signatures + boilerplate so a card
  // shows just the meaningful latest message.
  function cleanBody(text) {
    let s = String(text || '').replace(/\r/g, '\n').replace(/ /g, ' ');
    // 1) Payday/umboðsmanna-haus: raunverulega skeytið kemur á eftir „-##" merki.
    //    Ef upphafið lítur út eins og boilerplate-hausinn → henda honum.
    const sep = s.search(/[-–]\s*#{2,}/);
    if (sep > -1 && sep < 600 && /verkn[úu]mer|reply at the top|svarið efst/i.test(s.slice(0, sep))) {
      s = s.slice(sep).replace(/^[-–]\s*#{2,}\s*/, '');
    }
    // 2) skrúbba þekktar boilerplate-setningar hvar sem er
    s = s
      .replace(/#{0,2}\s*Verkn[úu]mer\s*:?\s*\S+/gi, ' ')
      .replace(/vinsamlegast hafið svarið efst í tölvupóstinum\.?/gi, ' ')
      .replace(/please reply at the top of (your |the )?e-?mail\.?/gi, ' ')
      .replace(/#{2,}/g, ' ');
    // 3) klippa við tilvitnun / áframsent haus
    const cuts = [
      /-{2,}\s*Original Message\s*-{2,}/i, /_{6,}/, /\bOn .{5,90}\bwrote:/i, /\bÞann .{5,90}\bskrifaði/i,
      /(^|\n)\s*From:\s*\S/i, /(^|\n)\s*Frá:\s*\S/i, /(^|\n)\s*Sent:\s*\S/i, /(^|\n)\s*Sendur?:\s*\S/i,
      /-{2,}\s*Áframsend/i, /\bFrom:\s*\S+@\S+/i,
    ];
    let cutAt = s.length;
    cuts.forEach(re => { const m = s.match(re); if (m && m.index != null && m.index >= 25 && m.index < cutAt) cutAt = m.index; });
    s = s.slice(0, cutAt);
    // 4) henda tilvitnunarlínum
    s = s.split('\n').filter(ln => {
      const t = ln.trim();
      if (/^>/.test(t)) return false;
      if (/^(sent from my|sent via|fá í síma|fæ í síma)/i.test(t)) return false;
      return true;
    }).join(' ');
    // 5) klippa undirskrift — allt frá fyrstu kveðju til enda (ef nóg efni á undan)
    const sm = s.match(/(með kveðju|kær kveðju|bestu kveðjur|kveðja|kv\.|best regards|kind regards|virðingarfyllst|mvh\b)[\s,]/i);
    if (sm && sm.index > 12) s = s.slice(0, sm.index);
    return s.replace(/\s+/g, ' ').replace(/^[\s\-–#/·:]+/, '').trim();
  }
  function normSubject(s) {
    let x = String(s || '');
    for (let i = 0; i < 4; i++) x = x.replace(/^\s*(re|sv|svar|fw|fwd|áframsent|aframsent|áfr)\s*:\s*/i, '');
    return x.replace(/\(#[^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function threadKey(m) {
    const subj = normSubject(m.subject);
    const kt = m.cust && ktDigits(m.cust.kt);
    const who = kt || (m.from || '').split('@')[1] || (m.from || '');
    return (subj || '(ekkert)') + '|' + who;
  }
  function groupThreads(emails) {
    const map = new Map();
    emails.forEach(m => {
      const k = m.threadKey || m.message_id;
      let g = map.get(k);
      if (!g) { g = { rep: m, msgs: [m] }; map.set(k, g); }
      else { g.msgs.push(m); if ((m.received_at || '') > (g.rep.received_at || '')) g.rep = m; }
    });
    return [...map.values()].map(g => {
      const rep = Object.assign({}, g.rep);
      rep._thread = g.msgs.slice().sort((a, b) => (b.received_at || '').localeCompare(a.received_at || ''));
      rep._threadCount = g.msgs.length;
      rep._threadIds = g.msgs.map(x => x.message_id);
      return rep;
    });
  }
  function isAnswered(rep) { return state.activity.has(rep.message_id); }
  // 17.09.2026: .insert() kastar ekki — villan kom í .error og var aldrei lesin.
  // Áður: merkið fór í state og „✓ Merkt svarað" birtist þótt ekkert vistaðist;
  // við næstu hleðslu var málið ósvarað aftur og enginn vissi af hverju.
  // Skilar true/false svo kallandinn geti sagt satt.
  async function logActivity(message_id, kind) {
    if (!message_id) return false;
    state.activity.add(message_id);
    const SB = getSB();
    let err = SB ? null : new Error('enginn gagnagrunnstengill');
    if (SB) {
      try { const r = await SB.from('reikninga_postur_activity').insert({ message_id, kind: kind || 'reply' }); err = r && r.error; }
      catch (e) { err = e; }
    }
    if (err) {
      state.activity.delete(message_id);   // taka staðbundnu merkinguna til baka — hún vistaðist ekki
      try { if (window.logProblem) window.logProblem('rp_activity_save_failed', 'message_id ' + message_id + ' (' + (kind || 'reply') + '): ' + String((err && err.message) || err)); } catch (_) {}
      return false;
    }
    return true;
  }
  // Manual tag + note per message_id — upsert to Supabase (synced across devices).
  // 17.09.2026: .upsert()/.delete() kasta ekki. Áður: merki og nóta fóru í state,
  // „🏷️ Vistað" birtist og nótan var horfin við næstu hleðslu — og í öðru tæki
  // sást hún aldrei. Nú er fyrra gildið sett aftur og sagt hreint frá.
  async function saveMeta(message_id, manual_tag, note) {
    if (!message_id) return false;
    manual_tag = String(manual_tag || '').trim();
    note = String(note || '').trim();
    const fyrra = state.meta[message_id];                       // til að afturkalla ef vistun mistekst
    if (!manual_tag && !note) delete state.meta[message_id];
    else state.meta[message_id] = { manual_tag: manual_tag, note: note };
    const SB = getSB();
    let err = SB ? null : new Error('enginn gagnagrunnstengill');
    if (SB) {
      try {
        const r = (!manual_tag && !note)
          ? await SB.from('reikninga_postur_meta').delete().eq('message_id', message_id)
          : await SB.from('reikninga_postur_meta').upsert(
              { message_id: message_id, manual_tag: manual_tag || null, note: note || null, updated_at: new Date().toISOString() },
              { onConflict: 'message_id' });
        err = r && r.error;
      } catch (e) { err = e; }
    }
    if (err) {
      if (fyrra) state.meta[message_id] = fyrra; else delete state.meta[message_id];
      try { if (window.logProblem) window.logProblem('rp_meta_save_failed', 'message_id ' + message_id + ': ' + String((err && err.message) || err)); } catch (_) {}
      return false;
    }
    return true;
  }

  // ── styles (self-contained, #view-scoped so patch-245 can't override) ──────
  function styles() {
    if (document.getElementById('_rp-styles')) return;
    const V = '#' + VIEW_ID + ' ';
    const css = [
      V + '{padding:0 !important;max-width:none !important;background:linear-gradient(180deg,#060607 0px,#060607 95px,#aeb4be 360px,#9ba1ad 100%) !important;min-height:100vh;font-family:"IBM Plex Sans",-apple-system,"Segoe UI",sans-serif}',
      V + '.rp-main{max-width:none;margin:0;padding:16px 22px 48px;box-sizing:border-box}',
      V + '.rp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:14px}',
      V + '.rp-title h1{margin:0;font-size:26px;font-weight:700;color:#fff;letter-spacing:-.01em}',
      V + '.rp-title p{margin:3px 0 0;font-size:12.5px;color:rgba(255,255,255,.6)}',
      V + '.rp-reload{height:38px;padding:0 14px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font:inherit;font-size:13px}',
      // 21.09.2026: hausinn. Ein leitarlina, sidan tvaer flisaradir sem strjukast
      // i stad thess ad brotna nidur i fimm linur ofan vid fyrsta postinn.
      V + '.rp-bar{display:flex;align-items:center;gap:8px;margin-bottom:10px}',
      V + '.rp-ico{flex:none;position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.28);border-radius:11px;background:rgba(255,255,255,.12);color:#fff;font:inherit;font-size:16px;line-height:1;cursor:pointer}',
      V + '.rp-ico:hover{background:rgba(255,255,255,.2)}',
      V + '.rp-ico[disabled]{opacity:.6;cursor:default}',
      V + '.rp-ico.snyst{animation:rpSnua .9s linear infinite}',
      '@keyframes rpSnua{to{transform:rotate(360deg)}}',
      V + '.rp-ico .n{position:absolute;top:-5px;right:-5px;min-width:16px;height:16px;padding:0 4px;border-radius:9px;background:#d97757;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center}',
      // Ein lina sem ma strjuka. flex:none a flisunum svo thaer kremjist ekki.
      V + '.rp-tools{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;margin-bottom:10px;padding-bottom:2px}',
      V + '.rp-tools::-webkit-scrollbar{display:none}',
      V + '.rp-chip{flex:none}',
      V + '.rp-tagbar{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;margin:0 0 12px;padding-bottom:2px}',
      V + '.rp-tagbar::-webkit-scrollbar{display:none}',
      V + '.rp-tagchip{flex:none}',
      V + '.rp-tagbar-lbl{flex:none}',
      V + '.rp-chip{font:inherit;font-size:12.5px;font-weight:600;padding:7px 14px;border-radius:20px;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#3a4250;cursor:pointer}',
      V + '.rp-chip.on{border-color:#0a0b0d;background:linear-gradient(145deg,#08080a,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709);color:#fff}',
      V + '.rp-chip .n{opacity:.65;font-weight:500;margin-left:2px}',
      V + '.rp-search{position:relative;flex:1;min-width:0}',
      V + '.rp-search input{width:100%;height:38px;padding:0 12px 0 34px;border-radius:11px;border:1px solid rgba(255,255,255,.28) !important;background:rgba(255,255,255,.12) !important;color:#fff !important;font:inherit;font-size:13.5px;outline:none;box-sizing:border-box}',
      V + '.rp-search input::placeholder{color:rgba(255,255,255,.6)}',
      V + '.rp-search svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:rgba(255,255,255,.7)}',
      V + '.rp-list{display:flex;flex-direction:column;gap:6px}',
      // --- Gmail-rodin (21.09.2026) ---
      V + '.gm-row{padding:10px 13px;gap:12px;border-radius:11px;box-shadow:0 4px 14px -12px rgba(25,35,60,.5);cursor:pointer}',
      V + '.gm-row:hover{box-shadow:0 8px 20px -14px rgba(25,35,60,.55)}',
      V + '.gm-row.opin{box-shadow:0 14px 30px -16px rgba(25,35,60,.5);cursor:default}',
      V + '.gm-av{flex:none;width:34px;height:34px;border-radius:50%;color:#fff;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;margin-top:1px}',
      V + '.gm-mid{flex:1;min-width:0}',
      V + '.gm-top{display:flex;align-items:baseline;gap:10px}',
      V + '.gm-from{flex:1;min-width:0;font-size:13.5px;font-weight:700;color:#11141c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      V + '.gm-from .gm-me{font-weight:400;color:#94a3b8}',
      V + '.gm-from b{font-weight:700;color:#64748b;font-size:12px}',
      V + '.gm-time{flex:none;font-size:11.5px;color:#64748b;font-family:"JetBrains Mono",ui-monospace,monospace}',
      V + '.gm-subj{font-size:13px;font-weight:600;color:#1f2733;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      V + '.gm-snip{font-size:12px;color:#8a93a3;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      // Osvarad = svartara og feitara, eins og olesid i Gmail.
      V + '.gm-row:not(.answered) .gm-subj{font-weight:800;color:#0b0e14}',
      V + '.gm-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;align-items:center}',
      V + '.gm-att{font-size:10.5px;color:#475569;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:2px 7px;white-space:nowrap}',
      V + '.gm-lokid{font-size:10.5px;font-weight:700;color:#047857;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:20px;padding:2px 9px;white-space:nowrap}',
      V + '.gm-bidur{font-size:10.5px;font-weight:700;color:#b45309;background:#fff7ed;border:1px solid #fed7aa;border-radius:20px;padding:2px 9px;white-space:nowrap}',
      V + '.gm-falid{font-size:10.5px;font-weight:700;color:#94a3b8;background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;padding:2px 9px}',
      // Gmail-merkin hans. Teal svo thau ruglist ekki vid flokkana okkar.
      V + '.gm-merki{font:inherit;font-size:10.5px;font-weight:700;color:#0f766e;background:#f0fdfa;border:1px solid #99f6e4;border-radius:20px;padding:2px 9px;white-space:nowrap;cursor:pointer}',
      V + '.gm-merki:hover{background:#ccfbf1}',
      V + '.gm-stj{font-size:13.5px;line-height:1}',
      // Malid a Thjonustubordinu - blatt eins og bordid sjalft.
      V + '.gm-mal{font-size:10.5px;font-weight:700;color:#1d4ed8;background:#eff3ff;border:1px solid #c6d6ff;border-radius:20px;padding:2px 9px;white-space:nowrap}',
      V + '.gm-mal.lokid{color:#64748b;background:#f8fafc;border-color:#e2e8f0}',
      V + '.gm-malrod{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:#3a4250;background:#eff3ff;border:1px solid #c6d6ff;border-radius:9px;padding:7px 10px}',
      // Svarreiturinn i rodinni (21.09.2026).
      V + '.gm-svar{display:flex;flex-direction:column;gap:8px;border-top:1px dashed #e2e8f0;padding-top:10px}',
      V + '.gm-svar-efni{font:inherit;font-size:13px;font-weight:600;color:#11141c;padding:8px 10px;border:1px solid rgba(20,24,34,.16);border-radius:9px;background:#fff;box-sizing:border-box;width:100%}',
      V + '.gm-svar-texti{font:inherit;font-size:13px;color:#11141c;line-height:1.55;padding:10px;border:1px solid rgba(20,24,34,.16);border-radius:9px;background:#fff;box-sizing:border-box;width:100%;min-height:150px;resize:vertical}',
      V + '.gm-svar-efni:focus,' + V + '.gm-svar-texti:focus{outline:none;border-color:#2f5fe0;box-shadow:0 0 0 3px rgba(47,95,224,.14)}',
      V + '.gm-svar-fra{font-size:11.5px;color:#94a3b8}',
      V + '.gm-svar-msg{font-size:12px;padding:6px 9px;border-radius:8px;background:#f1f5f9;color:#475569}',
      V + '.gm-svar-msg.ok{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}',
      V + '.gm-svar-msg.bad{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}',
      V + '.rp-btn.prim{color:#fff;background:linear-gradient(180deg,#2f5fe0,#1d4ed8);border-color:#1d4ed8}',
      V + '.rp-tagchip.merki{color:#0f766e;background:#f0fdfa;border-color:#99f6e4}',
      V + '.rp-tagchip.stjarna{color:#a16207;background:#fefce8;border-color:#fde68a;font-size:13px}',
      // Opna rodin: netfang, kunni, allar adgerdir, allur thradurinn.
      V + '.gm-opid{margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;display:flex;flex-direction:column;gap:9px;cursor:default}',
      V + '.gm-netfang{font-size:11.5px;color:#94a3b8;font-family:"JetBrains Mono",ui-monospace,monospace;word-break:break-all}',
      V + '.gm-opid .rp-cust{text-align:left;max-width:100%}',
      V + '.gm-opid .rp-acts{justify-content:flex-start}',
      V + '.gm-opid .rp-thread-list{margin-top:0;border-top:0;padding-top:0}',
      // Simi: staerri snertifletir a tokkunum i opnu rodinni.
      '@media (max-width:640px){' +
        V + '.gm-av{width:30px;height:30px;font-size:13.5px}' +
        V + '.gm-row{padding:10px 11px;gap:10px}' +
        V + '.rp-main{padding:12px 13px 48px}' +
        V + '.gm-opid .rp-btn{padding:8px 12px;font-size:12px}' +
      '}',
      V + '.rp-card{background:#fff !important;border:1px solid rgba(20,24,34,.08) !important;border-left:3px solid #cbd5e1 !important;border-radius:13px;box-shadow:0 8px 22px -16px rgba(25,35,60,.22);padding:11px 15px;display:flex;align-items:flex-start;gap:14px}',
      V + '.rp-card.q{border-left-color:#f59e0b !important}',
      V + '.rp-card.matched{border-left-color:#2f5fe0 !important}',
      V + '.rp-when{flex:none;width:70px;text-align:center;color:#64748b;font-size:11.5px;font-family:"JetBrains Mono",ui-monospace,monospace}',
      V + '.rp-when b{display:block;color:#11141c;font-size:12.5px}',
      V + '.rp-mid{flex:1;min-width:0}',
      V + '.rp-from{font-size:13.5px;font-weight:700;color:#11141c;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      V + '.rp-from .em{font-weight:400;color:#94a3b8;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11.5px}',
      V + '.rp-subj{font-size:12.5px;color:#3a4250;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      V + '.rp-snip{font-size:12px;color:#64748b;margin-top:3px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:normal}',
      V + '.rp-badge{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:6px;white-space:nowrap}',
      V + '.rp-badge.q{color:#b45309;background:#fffbeb;border:1px solid #fde68a}',
      V + '.rp-badge.att{color:#475569;background:#f1f5f9;border:1px solid #e2e8f0}',
      // „hvað snýst um" merking (tag) — litakóðuð eftir flokki
      V + '.rp-tag{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;border:1px solid}',
      V + '.rp-tag.blue{color:#1d4ed8;background:#eff3ff;border-color:#c6d6ff}',
      V + '.rp-tag.green{color:#047857;background:#ecfdf5;border-color:#a7f3d0}',
      V + '.rp-tag.amber{color:#b45309;background:#fffbeb;border-color:#fde68a}',
      V + '.rp-tag.red{color:#be123c;background:#fef2f2;border-color:#fecaca}',
      V + '.rp-tag.purple{color:#7c3aed;background:#f5f0ff;border-color:#ddd6fe}',
      V + '.rp-tag.teal{color:#0f766e;background:#f0fdfa;border-color:#99f6e4}',
      V + '.rp-tag.slate{color:#475569;background:#f1f5f9;border-color:#e2e8f0}',
      V + '.rp-tag.gray{color:#64748b;background:#f8fafc;border-color:#e2e8f0}',
      V + '.rp-tag.q{color:#b45309;background:#fffbeb;border-color:#fde68a}',
      V + '.rp-tag.fire{color:#c2410c;background:#fff7ed;border-color:#fdba74}',
      V + '.rp-note{font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:5px 9px;margin-top:6px;line-height:1.4;white-space:pre-wrap}',
      V + '.rp-btn.tag{color:#c2410c;border-color:#fed7aa;background:#fff7ed}',
      V + '.rp-btn.tag:hover{background:#ffedd5}',
      // Tag-filter row
      // 21.09.2026: ein lina sem ma strjuka. Thessi regla stendur NEDAR en
      // .rp-bar-reglurnar og vinnur their - thvi er hun lagfaerd her, ekki thar.
      V + '.rp-tagbar{display:flex;flex-wrap:nowrap;align-items:center;gap:7px;margin:0 0 12px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:2px}',
      V + '.rp-tagbar-lbl{font-size:12px;font-weight:600;color:#8a93a3;margin-right:2px}',
      V + '.rp-tagchip{font:inherit;font-size:11.5px;font-weight:700;padding:5px 11px;border-radius:20px;white-space:nowrap;cursor:pointer;border:1px solid;transition:box-shadow .12s,transform .08s}',
      V + '.rp-tagchip:hover{transform:translateY(-1px)}',
      V + '.rp-tagchip.on{box-shadow:0 0 0 2px #0a0b0d,0 2px 6px rgba(0,0,0,.25);font-weight:800}',
      V + '.rp-tagchip .n{opacity:.6;font-weight:600;margin-left:2px}',
      V + '.rp-tagchip.clearall{color:#64748b;background:#fff;border-color:#d7dce4}',
      V + '.rp-tagchip.clearall:hover{background:#f1f5f9}',
      V + '.rp-badge.ans{color:#047857;background:#ecfdf5;border:1px solid #a7f3d0}',
      V + '.rp-badge.wait{color:#b45309;background:#fff7ed;border:1px solid #fed7aa}',
      V + '.rp-threadb{font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:20px;white-space:nowrap;border:1px solid #ddd6fe;background:#f5f0ff;color:#7c3aed;cursor:pointer;font-family:inherit}',
      V + '.rp-threadb:hover{background:#ede4ff}',
      V + '.rp-card.answered{opacity:.72}',
      V + '.rp-card.answered:hover{opacity:1}',
      V + '.rp-btn.ok{padding:5px 10px;color:#047857;border-color:#a7f3d0;background:linear-gradient(180deg,#fff,#ecfdf5)}',
      V + '.rp-btn.ok:hover{background:#d1fae5}',
      V + '.rp-thread-list{margin-top:8px;border-top:1px dashed #e2e8f0;padding-top:7px;display:flex;flex-direction:column;gap:6px}',
      V + '.rp-thread-msg{font-size:11.5px;color:#64748b;padding-left:10px;border-left:2px solid #e2e8f0}',
      V + '.rp-thread-msg .d{font-family:"JetBrains Mono",ui-monospace,monospace;color:#94a3b8}',
      V + '.rp-thread-msg .s{font-weight:700;color:#3a4250}',
      V + '.rp-thread-msg .ans{color:#059669}',
      V + '.rp-thread-msg .tx{color:#94a3b8;margin-top:1px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      V + '.rp-badge.pay{color:#2f5fe0;background:#eef3ff;border:1px solid #c6d6ff}',
      V + '.rp-right{flex:0 1 auto;display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:150px;max-width:300px}',
      V + '.rp-cust{max-width:230px;text-align:right;font-size:12.5px;font-weight:700;color:#1d4ed8;text-decoration:none;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}',
      V + '.rp-cust .by{display:block;font-weight:500;color:#94a3b8;font-size:10.5px}',
      V + '.rp-nomatch{font-size:11.5px;color:#cbd2dc;font-style:italic}',
      V + '.rp-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}',
      // Þröngir skjáir: stafla — texti fær fulla breidd, aðgerðir fyrir neðan.
      '@media (max-width:1024px){' +
        V + '.rp-card{flex-wrap:wrap}' +
        V + '.rp-mid{flex:1 1 100%;min-width:0}' +
        V + '.rp-when{width:auto;text-align:left;display:flex;gap:8px;align-items:baseline}' +
        V + '.rp-right{width:100%;max-width:none;flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:flex-start;margin-top:8px}' +
        V + '.rp-acts{justify-content:flex-start}' +
        V + '.rp-cust{text-align:left}' +
      '}',
      V + '.rp-btn{font:inherit;font-size:11.5px;font-weight:600;padding:5px 11px;border-radius:8px;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fff,#eef1f6);color:#3a4250;cursor:pointer;white-space:nowrap}',
      V + '.rp-btn:hover{background:#eef3ff;color:#1d4ed8;border-color:#c6d6ff}',
      V + '.rp-btn.del{padding:5px 9px}',
      V + '.rp-btn.del:hover{background:#fef2f2;color:#dc2626;border-color:#fecaca}',
      V + '.rp-btn.mute{padding:5px 9px}',
      V + '.rp-btn.mute:hover{background:#fff7ed;color:#c2410c;border-color:#fed7aa}',
      V + '.rp-empty{padding:44px;text-align:center;color:#64748b;background:rgba(255,255,255,.75);border-radius:14px}',
      V + '.rp-err{padding:20px;color:#fecaca;background:#450a0a;border:1px solid #7f1d1d;border-radius:12px}',
      V + '.rp-btn.prim{background:linear-gradient(180deg,#3b82f6,#1d4ed8);color:#fff;border-color:#1d4ed8}',
      V + '.rp-btn.prim:hover{background:linear-gradient(180deg,#2563eb,#1e40af);color:#fff}',
      V + '.rp-btn.ai{background:linear-gradient(180deg,#fff,#f3e8ff);color:#7c3aed;border-color:#ddd6fe}',
      V + '.rp-btn.ai:hover{background:#f5f0ff;color:#6d28d9;border-color:#c4b5fd}',
      // ── modal (appended to body — outside .view so patch-245 can't touch it) ──
      '#_rp-modal{position:fixed;inset:0;z-index:100050;display:flex;align-items:center;justify-content:center;font-family:"IBM Plex Sans",-apple-system,"Segoe UI",sans-serif}',
      '#_rp-modal .rpm-back{position:absolute;inset:0;background:rgba(6,7,10,.62);backdrop-filter:blur(2px)}',
      '#_rp-modal .rpm-card{position:relative;background:#fff;border-radius:16px;box-shadow:0 30px 80px -20px rgba(0,0,0,.6);width:min(560px,calc(100vw - 24px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden}',
      '#_rp-modal .rpm-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 20px;border-bottom:1px solid #eef1f6}',
      '#_rp-modal .rpm-head h3{margin:0;font-size:16px;font-weight:700;color:#11141c}',
      '#_rp-modal .rpm-head .sub{font-size:11.5px;color:#94a3b8;font-weight:500;margin-top:1px}',
      '#_rp-modal .rpm-x{background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer;padding:2px 8px;border-radius:8px;line-height:1}',
      '#_rp-modal .rpm-x:hover{background:#f1f5f9;color:#334155}',
      '#_rp-modal .rpm-body{padding:18px 20px;overflow:auto}',
      '#_rp-modal .rpm-tags{display:flex;flex-wrap:wrap;gap:7px}',
      '#_rp-modal .rpm-tagchip{font:inherit;font-size:12px;font-weight:700;padding:6px 12px;border-radius:20px;white-space:nowrap;cursor:pointer;border:1px solid;transition:box-shadow .12s,transform .08s}',
      '#_rp-modal .rpm-tagchip:hover{transform:translateY(-1px)}',
      '#_rp-modal .rpm-tagchip.on{box-shadow:0 0 0 2px #0a0b0d,0 2px 6px rgba(0,0,0,.25);font-weight:800}',
      // Tag colours repeated under the modal (the .rp-tag.* set is #view-scoped; the modal lives on <body>)
      '#_rp-modal .rp-tag.blue{color:#1d4ed8;background:#eff3ff;border-color:#c6d6ff}',
      '#_rp-modal .rp-tag.green{color:#047857;background:#ecfdf5;border-color:#a7f3d0}',
      '#_rp-modal .rp-tag.amber{color:#b45309;background:#fffbeb;border-color:#fde68a}',
      '#_rp-modal .rp-tag.red{color:#be123c;background:#fef2f2;border-color:#fecaca}',
      '#_rp-modal .rp-tag.purple{color:#7c3aed;background:#f5f0ff;border-color:#ddd6fe}',
      '#_rp-modal .rp-tag.teal{color:#0f766e;background:#f0fdfa;border-color:#99f6e4}',
      '#_rp-modal .rp-tag.slate{color:#475569;background:#f1f5f9;border-color:#e2e8f0}',
      '#_rp-modal .rp-tag.gray{color:#64748b;background:#f8fafc;border-color:#e2e8f0}',
      '#_rp-modal .rp-tag.q{color:#b45309;background:#fffbeb;border-color:#fde68a}',
      '#_rp-modal .rp-tag.fire{color:#c2410c;background:#fff7ed;border-color:#fdba74}',
      '#_rp-modal .rpm-lbl{display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin:0 0 5px}',
      '#_rp-modal .rpm-row{margin-bottom:14px}',
      '#_rp-modal .rpm-opna{margin-left:auto;font-size:12px;font-weight:700;color:#2563eb;text-decoration:none;background:none;border:1px solid #bfdbfe;border-radius:7px;padding:2px 9px;cursor:pointer;font-family:inherit;white-space:nowrap}',
      '#_rp-modal .rpm-opna:hover{background:#eff6ff}',
      '#_rp-modal input[type=email],#_rp-modal input[type=text],#_rp-modal textarea{width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:9px;font:inherit;font-size:13.5px;color:#11141c;box-sizing:border-box;background:#fff}',
      '#_rp-modal input:focus,#_rp-modal textarea:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}',
      '#_rp-modal textarea{resize:vertical;min-height:150px;line-height:1.5}',
      '#_rp-modal textarea.reply{min-height:230px;font-size:13.5px}',
      '#_rp-modal .rpm-invs{display:flex;flex-direction:column;gap:6px;max-height:210px;overflow:auto;border:1px solid #eef1f6;border-radius:10px;padding:7px}',
      '#_rp-modal .rpm-inv{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;border:1px solid transparent}',
      // 19.09.2026: skjalaval (fjolval) notar sama utlit og reikningavalid.
      '#_rp-modal .rpm-doc{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;border:1px solid transparent}',
      '#_rp-modal .rpm-doc:hover{background:#f8fafc}',
      '#_rp-modal .rpm-doc .n{flex:1;font-weight:600}',
      '#_rp-modal .rpm-doc .meta{font-size:12px;color:#64748b;text-align:right}',
      '#_rp-modal .rpm-docs{max-height:190px;overflow:auto}',
      '#_rp-modal .rpm-inv:hover{background:#f8fafc}',
      '#_rp-modal .rpm-inv.sel{background:#eef3ff;border-color:#c6d6ff}',
      '#_rp-modal .rpm-inv input{width:auto;flex:none}',
      '#_rp-modal .rpm-inv .n{font-weight:700;color:#11141c;font-size:13px}',
      '#_rp-modal .rpm-inv .meta{font-size:11.5px;color:#64748b;margin-left:auto;text-align:right}',
      '#_rp-modal .rpm-inv .paid{color:#059669;font-weight:700}',
      '#_rp-modal .rpm-src{font-size:11.5px;color:#475569;background:#f8fafc;border:1px solid #eef1f6;border-radius:9px;padding:10px 12px;line-height:1.5;max-height:120px;overflow:auto}',
      '#_rp-modal .rpm-summary{font-size:13px;color:#11141c;background:#eff6ff;border:1px solid #bfdbfe;border-radius:9px;padding:9px 12px;line-height:1.45}',
      '#_rp-modal .rpm-docs{display:flex;flex-direction:column;gap:6px}',
      '#_rp-modal .rpm-doc{display:flex;align-items:center;gap:10px;padding:7px 10px;border:1px solid #eef1f6;border-radius:9px;background:#fff}',
      '#_rp-modal .rpm-doc.match{background:#fffbeb;border-color:#fde68a}',
      '#_rp-modal .rpm-doc .n{font-weight:700;color:#11141c;font-size:13px}',
      '#_rp-modal .rpm-doc .meta{font-size:11.5px;color:#64748b;margin-left:auto}',
      '#_rp-modal .rpm-doc-send{font:inherit;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:8px;border:1px solid #c6d6ff;background:linear-gradient(180deg,#eff3ff,#dbe6ff);color:#1d4ed8;cursor:pointer;white-space:nowrap}',
      '#_rp-modal .rpm-doc-send:hover{background:#dbe6ff}',
      '#_rp-modal .rpm-doc-send.sent{background:#ecfdf5;border-color:#a7f3d0;color:#059669}',
      '#_rp-modal .rpm-src b{color:#11141c}',
      '#_rp-modal .rpm-note{font-size:12px;color:#94a3b8;margin:-6px 0 12px}',
      '#_rp-modal .rpm-ai-tip{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}',
      '#_rp-modal .rpm-ai-tip button{font:inherit;font-size:11.5px;padding:5px 10px;border-radius:16px;border:1px solid #ddd6fe;background:#f5f0ff;color:#7c3aed;cursor:pointer}',
      '#_rp-modal .rpm-ai-tip button:hover{background:#ede4ff}',
      '#_rp-modal .rpm-foot{display:flex;align-items:center;gap:9px;justify-content:flex-end;padding:13px 20px;border-top:1px solid #eef1f6;flex-wrap:wrap}',
      '#_rp-modal .rpm-foot .spacer{margin-right:auto}',
      '#_rp-modal .rpm-btn{font:inherit;font-size:13px;font-weight:600;padding:9px 16px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;color:#475569;cursor:pointer}',
      '#_rp-modal .rpm-btn:hover{background:#f8fafc}',
      '#_rp-modal .rpm-btn.prim{background:linear-gradient(180deg,#3b82f6,#1d4ed8);color:#fff;border:none}',
      '#_rp-modal .rpm-btn.prim:hover{background:linear-gradient(180deg,#2563eb,#1e40af)}',
      '#_rp-modal .rpm-btn.ai{background:linear-gradient(180deg,#8b5cf6,#6d28d9);color:#fff;border:none}',
      '#_rp-modal .rpm-btn.ai:hover{background:linear-gradient(180deg,#7c3aed,#5b21b6)}',
      '#_rp-modal .rpm-btn:disabled{opacity:.55;cursor:not-allowed}',
      '#_rp-modal .rpm-msg{font-size:12.5px;font-weight:600}',
      '#_rp-modal .rpm-msg.ok{color:#059669}',
      '#_rp-modal .rpm-msg.bad{color:#dc2626}',
      '#_rp-modal .rpm-load{padding:34px;text-align:center;color:#64748b;font-size:13px}',
    ].join('');
    const tag = document.createElement('style');
    tag.id = '_rp-styles'; tag.textContent = css;
    document.head.appendChild(tag);
  }

  // ── render ──────────────────────────────────────────────────────────────
  function viewEl() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div');
    v.id = VIEW_ID; v.className = 'view';
    document.body.appendChild(v);
    return v;
  }

  function isHidden(m) { return state.hidden.has(m.message_id); }
  // Auto-hide rules: a mail matches if its sender / sender-domain / subject
  // hits any rule the user added. Matched mail drops out of the normal views.
  function ruleMatches(m) {
    const from = (m.from || '').toLowerCase();
    const dom = from.split('@')[1] || '';
    const subj = (m.subject || '').toLowerCase();
    return (state.rules || []).some(r => {
      const p = String(r.pattern || '').toLowerCase().trim();
      if (!p) return false;
      if (r.rule_type === 'sender') return from === p;
      if (r.rule_type === 'domain') return dom === p || dom.endsWith('.' + p) || from.endsWith('@' + p);
      if (r.rule_type === 'subject') return subj.indexOf(p) !== -1;
      return false;
    });
  }
  function isFiltered(m) { return !isHidden(m) && ruleMatches(m); }   // rule-hidden (not manually deleted)
  function counts() {
    const live = state.emails.filter(m => !isHidden(m) && !ruleMatches(m));
    const inboxEmails = live.filter(m => m.category === 'inbox' && !m.isSystem);
    const inboxThreads = groupThreads(inboxEmails);
    return {
      inbox: inboxThreads.length,
      sent: groupThreads(live.filter(m => m.category === 'sent')).length,
      all: groupThreads(live).length,
      unanswered: inboxThreads.filter(t => !isAnswered(t)).length,
      hidden: groupThreads(state.emails.filter(isHidden)).length,
      filtered: groupThreads(state.emails.filter(isFiltered)).length,
    };
  }

  // Emails after the active view chip + search, but BEFORE the tag filter — the
  // base set both currentRows() and the tag-chip counts share.
  function baseRows() {
    // 1) filter individual emails by the active view
    let rows;
    if (state.filter === 'hidden') rows = state.emails.filter(isHidden);
    else if (state.filter === 'filtered') rows = state.emails.filter(isFiltered);
    else {
      rows = state.emails.filter(m => !isHidden(m) && !ruleMatches(m));
      if (state.filter === 'sent') rows = rows.filter(m => m.category === 'sent');
      else rows = rows.filter(m => m.category === 'inbox' && !m.isSystem); // inbox / unanswered / all(inbox side)
      if (state.filter === 'all') rows = state.emails.filter(m => !isHidden(m) && !ruleMatches(m));
    }
    // 2) search (on individual emails)
    const q = state.search.trim().toLowerCase();
    if (q) rows = rows.filter(m =>
      (m.sender_name || '').toLowerCase().includes(q) ||
      (m.from || '').includes(q) ||
      (m.subject || '').toLowerCase().includes(q) ||
      (m.clean || '').toLowerCase().includes(q) ||
      (m.cust && (m.cust.name || '').toLowerCase().includes(q)));
    return rows;
  }

  // Count of threads per tag label in the current view+search context (before the
  // tag filter), so the tag chips show how many conversations each category holds.
  function tagCounts() {
    const out = {};
    groupThreads(baseRows()).forEach(t => { const tg = tagFor(t); if (tg) out[tg.label] = (out[tg.label] || 0) + 1; });
    return out;
  }

  function currentRows() {
    let rows = baseRows();
    if (state.tagFilter) rows = rows.filter(m => { const t = tagFor(m); return t && t.label === state.tagFilter; });
    // Gmail-merkjasia. Unnin a stokum skeytum adur en thraedir eru sameinadir,
    // svo samtal birtist se EITT skeyti i thvi merkt.
    if (state.merki) rows = rows.filter(m => {
      const l = Array.isArray(m.labels) ? m.labels : [];
      return state.merki === STJARNA ? erStjornumerkt(l) : l.indexOf(state.merki) >= 0;
    });
    // 3) combine into threads (one card per conversation)
    let threads = groupThreads(rows);
    if (state.filter === 'unanswered') threads = threads.filter(t => !isAnswered(t));
    // 4) RÖÐUN: NÝJAST FYRST, ALLTAF — eins og pósthólf (21.09.2026).
    //
    // Áður flutu ósvaraðir og `is_question` efst. Þá sat fyrirspurn Auðar hjá
    // Reykjavíkurborg frá í DAG í 15. sæti, undir markpósti frá Teya frá 10. sept.
    // sem `is_question` hafði merkt spurningu („Hvernig stöndum við okkur?").
    // Staðan er hvort sem er á röðinni sjálfri („Lokið" / „Bíður svars") og í
    // flísinni „Ósvarað" — hún á ekki líka að hnika til tímaröðinni.
    threads.sort((a, b) => (b.received_at || '').localeCompare(a.received_at || ''));
    return threads;
  }

  // Rule-based „hvað snýst pósturinn um" merking (engin AI — keyrir á öllum póstum).
  // Fyrsta samsvörun ræður. Skilar {label, cls} eða null.
  // Catalog for the tag-filter chip row — same labels/colours tagFor() emits, in
  // display order. Only chips with a live count are shown. „Senda kröfu" is a
  // MANUAL-only tag (never auto-detected) — it leads so it's easy to reach.
  var SENDA_KROFU = '🧾 Senda kröfu';
  var TAG_CATALOG = [
    { label: SENDA_KROFU, cls: 'fire' },
    { label: '🧾 Reikningsbeiðni', cls: 'blue' },
    { label: '🔧 Leiðrétting', cls: 'amber' },
    { label: '⏰ Innheimta', cls: 'red' },
    { label: '💳 Greiðsla', cls: 'green' },
    { label: '📋 Tilboð', cls: 'purple' },
    { label: '🛒 Pöntun', cls: 'teal' },
    { label: '📄 Skýrsla', cls: 'slate' },
    { label: '❓ Fyrirspurn', cls: 'q' },
    { label: '🏦 Áreiðanleikakönnun', cls: 'gray' },
    { label: '🧾 Payday-afrit', cls: 'gray' },
  ];

  // Manual override + note, keyed by message_id but resolved across the whole
  // thread so a tag/note set on any message in a conversation sticks to the card.
  function metaFor(m) {
    const ids = threadIds(m);
    for (var i = 0; i < ids.length; i++) { if (state.meta[ids[i]]) return state.meta[ids[i]]; }
    return null;
  }

  // --- GMAIL-MERKIN (21.09.2026) ------------------------------------------
  // Litastjornur Gmail. STARRED fylgir ALLTAF med thegar stjarna er sett;
  // lita-merkid segir hver hun er. Ein stjarna a rodina, i hans lit.
  const STJORNUR = {
    STARRED: { t: '★', c: '#eab308' },
    YELLOW_STAR: { t: '★', c: '#eab308' }, ORANGE_STAR: { t: '★', c: '#f97316' },
    RED_STAR: { t: '★', c: '#dc2626' },    BLUE_STAR: { t: '★', c: '#2563eb' },
    PURPLE_STAR: { t: '★', c: '#7c3aed' }, GREEN_STAR: { t: '★', c: '#059669' },
    GREEN_CIRCLE: { t: '●', c: '#059669' },BLUE_CIRCLE: { t: '●', c: '#2563eb' },
    RED_CIRCLE: { t: '●', c: '#dc2626' },  ORANGE_GUILLEMET: { t: '»', c: '#f97316' },
    YELLOW_BANG: { t: '!', c: '#eab308' },      RED_BANG: { t: '!', c: '#dc2626' },
    PURPLE_QUESTION: { t: '?', c: '#7c3aed' },  GREEN_CHECK: { t: '✓', c: '#059669' },
  };
  const STJARNA = '\u2605';   // gildid sem siuflisin notar
  // Gmail ad flokka sjalft. Geymt, en ekki sett a rodina - CATEGORY_PERSONAL
  // var a 77 postum af 167 og segir ekkert um malid.
  const MERKI_HULIN = /^(CATEGORY_[A-Z_]+|IMPORTANT|CHAT|SPAM|TRASH|OPENED)$/;

  // Merki ur ollum thraedinum: merkti hann eitt skeyti i samtalinu er samtalid merkt.
  function merkiThradar(m) {
    const ut = [];
    ((m._thread && m._thread.length) ? m._thread : [m]).forEach(function (o) {
      (Array.isArray(o.labels) ? o.labels : []).forEach(function (n) {
        if (n && ut.indexOf(n) < 0) ut.push(n);
      });
    });
    return ut;
  }
  // Hans eigin merki - allt sem Gmail bjo ekki til sjalft.
  function merkiEigin(m) {
    return merkiThradar(m).filter(function (n) { return !STJORNUR[n] && !MERKI_HULIN.test(n); });
  }
  function erStjornumerkt(list) {
    return list.some(function (n) { return !!STJORNUR[n]; });
  }
  function stjarnaHtml(list) {
    if (!erStjornumerkt(list)) return '';
    // Lita-merkid raedur; STARRED eitt og ser er gula sjalfgefna stjarnan.
    const lit = list.filter(function (n) { return n !== 'STARRED' && STJORNUR[n]; })
      .map(function (n) { return STJORNUR[n]; })[0] || STJORNUR.STARRED;
    return '<span class="gm-stj" style="color:' + lit.c + '" title="Stj\u00f6rnumerkt \u00ed Gmail">' + lit.t + '</span>';
  }

  function tagFor(m) {
    // Manual tag wins over the rule-based guess.
    const mm = metaFor(m);
    if (mm && mm.manual_tag) {
      const def = TAG_CATALOG.filter(function (t) { return t.label === mm.manual_tag; })[0];
      return def ? { label: def.label, cls: def.cls } : { label: mm.manual_tag, cls: 'slate' };
    }
    const hay = ((m.subject || '') + ' ' + (m.body_preview || '') + ' ' + (m.snippet || '')).toLowerCase();
    const T = (label, cls) => ({ label: label, cls: cls });
    if (m.isPayday) return T('🧾 Payday-afrit', 'gray');
    if (/áreiðanleika|reiðanleikakönnun|\baml\b|know your customer|\bkyc\b/.test(hay)) return T('🏦 Áreiðanleikakönnun', 'gray');
    if (/(senda|sent|sendið|sendu|fá|fæ|vantar|afrit).{0,22}(reikning|kröfu|kvittun)|reikning.{0,22}(afrit|vantar|sent|sendan)|afrit af reikning|copy of (the )?invoice|send.{0,15}invoice/.test(hay)) return T('🧾 Reikningsbeiðni', 'blue');
    if (/leiðrétt|rangt|rangur|röng|villa í reikning|of há|of lág|breyta reikning|athugasemd við reikning|kreditreikning|credit note/.test(hay)) return T('🔧 Leiðrétting', 'amber');
    if (/áminning|innheimt|gjaldfalli|vanskil|ítrekun|dráttarvext|í vanskilum/.test(hay)) return T('⏰ Innheimta', 'red');
    if (/greitt|greiðsl|millifær|innborgun|búið að borga|greiðslu|payment (made|received)|\bpaid\b/.test(hay)) return T('💳 Greiðsla', 'green');
    if (/tilboð|verðtilboð|verð fyrir|kostnaðaráætl|verðfyrirspurn|quote|quotation/.test(hay)) return T('📋 Tilboð', 'purple');
    if (/pöntun|panta |langar að kaupa|vil kaupa|\border\b/.test(hay)) return T('🛒 Pöntun', 'teal');
    if (/úttektarskýrsl|ástandsskoðun|skoðunarskýrsl|\bskýrsla\b|\búttekt\b/.test(hay)) return T('📄 Skýrsla', 'slate');
    if (m.is_question) return T('❓ Fyrirspurn', 'q');
    return null;
  }

  function rowHTML(m, i) {
    const inbox = m.category === 'inbox' && !m.isSystem;
    const answered = isAnswered(m);
    const cls = 'rp-card' + (inbox && !answered && m.is_question ? ' q' : (m.cust ? ' matched' : '')) + (answered ? ' answered' : '');
    const badges = [];
    const tag = tagFor(m);
    if (tag) badges.push('<span class="rp-tag ' + tag.cls + ' _rp-tagf" data-tag="' + esc(tag.label) + '" title="Sía á þennan flokk">' + tag.label + '</span>');
    if (inbox) badges.push(answered
      ? '<span class="rp-badge ans">✓ Svarað</span>'
      : '<span class="rp-badge wait">⏳ Ósvarað</span>');
    if (m.has_attachment) badges.push('<span class="rp-badge att">📎</span>');
    if (m._threadCount > 1) badges.push('<button class="rp-threadb _rp-thread" data-k="' + esc(m.threadKey) + '" type="button" title="Sýna allt samtalið">💬 ' + m._threadCount + '</button>');
    // Subject/snippet fall back to a thread sibling that DOES carry text, so a
    // thread whose newest message is a bare scrape still shows something.
    const sib = (m._thread || []).find(o => (o.clean || o.snippet || o.body_preview || '').trim()) || null;
    const subj = m.subject || (sib && sib.subject) || '(ekkert efni)';
    const snip = ((m.clean || m.snippet || m.body_preview || '')
      || (sib ? (sib.clean || sib.snippet || sib.body_preview || '') : '')).replace(/\s+/g, ' ').trim();
    const custHTML = m.cust
      ? '<a class="rp-cust" ' + (m.cust.coId ? 'data-co="' + esc(String(m.cust.coId)) + '" ' : '') + (m.cust.kt ? 'data-kt="' + esc(ktDigits(m.cust.kt)) + '" ' : '') + 'title="Opna kúnna">' + esc(m.cust.name || '—') + '<span class="by">tengt: ' + esc(m.matchBy || '') + (m.sale ? ' · ' + esc(m.sale.num) : '') + '</span></a>'
      : '<span class="rp-nomatch">enginn kúnni fannst</span>';
    const acts = [];
    const di = ' data-i="' + i + '"';
    // Delete / restore — hide a handled email (synced across devices via Supabase).
    if (isHidden(m)) acts.push('<button class="rp-btn _rp-restore"' + di + ' type="button" title="Endurheimta póst">↩︎ Endurheimta</button>');
    // Tier 3 — draft a reply to anything that landed in the inbox (real people).
    if (m.category === 'inbox' && !m.isSystem && !isHidden(m)) acts.push('<button class="rp-btn ai _rp-reply"' + di + ' type="button" title="Semja svar með Claude">🤖 Svar</button>');
    if (inbox && !answered && !isHidden(m)) acts.push('<button class="rp-btn ok _rp-answered"' + di + ' type="button" title="Merkja sem svarað">✓</button>');
    // Tier 2 — resend an invoice PDF (needs a customer to list invoices, or a matched sale).
    if (m.cust || m.sale) acts.push('<button class="rp-btn prim _rp-send"' + di + ' type="button" title="Senda reikning sem PDF">✉️ Senda</button>');
    // Tier 2 — jump straight into the matched invoice to change it.
    if (m.sale) acts.push('<button class="rp-btn _rp-edit"' + di + ' type="button" title="Breyta reikningi">✏️ Breyta</button>');
    if (m.cust && (m.cust.coId || m.cust.kt)) {
      acts.push('<button class="rp-btn _rp-open" ' + (m.cust.coId ? 'data-co="' + esc(String(m.cust.coId)) + '" ' : '') + (m.cust.kt ? 'data-kt="' + esc(ktDigits(m.cust.kt)) + '" ' : '') + 'type="button">Opna</button>');
      if (m.cust.kt) acts.push('<button class="rp-btn _rp-saga" data-kt="' + esc(ktDigits(m.cust.kt)) + '" type="button">Saga</button>');
    }
    // Manual tag + minnispunktur — set a flokk by hand (t.d. „Senda kröfu") og skrifa nótu.
    if (!isHidden(m)) acts.push('<button class="rp-btn tag _rp-meta"' + di + ' type="button" title="Setja flokk handvirkt + skrifa minnispunkt">🏷️ Merkja</button>');
    if (!isHidden(m) && m.from) acts.push('<button class="rp-btn mute _rp-mute"' + di + ' type="button" title="Fela sjálfkrafa alla pósta frá ' + esc(m.from) + '">🔇</button>');
    if (!isHidden(m)) acts.push('<button class="rp-btn del _rp-del"' + di + ' type="button" title="Eyða / fela þessum pósti">🗑</button>');
    const note = (metaFor(m) || {}).note || '';
    const older = (m._threadCount > 1 && (state.opin.has(m.threadKey) || state.expanded.has(m.threadKey))) ? (m._thread || []).slice(1) : [];
    const olderHTML = older.length
      ? '<div class="rp-thread-list">' + older.map(o =>
          '<div class="rp-thread-msg"><span class="d">' + esc(fmtDate(o.received_at)) + '</span> · <span class="s">' + esc(o.sender_name || o.from) + '</span>' +
          (isAnswered(o) ? ' <span class="ans">✓</span>' : '') +
          '<div class="tx">' + esc((o.clean || o.snippet || '').slice(0, 200)) + '</div></div>').join('') + '</div>'
      : '';
    // 21.09.2026 - GMAIL-ROD. Listinn er bara listi; adgerdirnar bua i opnu
    // rodinni. Somu takkar og adur, sami data-i, somu handhafar.
    const opin = state.opin.has(m.threadKey);
    const nafn = (m.sender_name || m.from || '?').trim();
    const staf = (nafn.replace(/[^A-Za-z\u00C0-\u017F]/g, '')[0] || '?').toUpperCase();
    // Litur er fasti af netfanginu - sami sendandi faer alltaf sama lit.
    const LITIR = ['#d97757','#2f7a4a','#4f46e5','#b5522a','#0f766e','#a16207','#7c3aed','#0369a1'];
    let hsh = 0; const lyk = String(m.from || nafn);
    for (let z = 0; z < lyk.length; z++) hsh = (hsh * 31 + lyk.charCodeAt(z)) % 99991;
    const litur = LITIR[hsh % LITIR.length];
    const fraTexti = esc(nafn)
      + (m._threadCount > 1 ? '<span class="gm-me">, me</span> <b>' + m._threadCount + '</b>' : '');
    // Vidhengin med NAFNI, ur ollum thraedinum - sendir postar okkar bera aldrei
    // has_attachment (innsogid les tha med format=metadata), svo eitt skeyti dugar ekki.
    const vidhNofn = [];
    ((m._thread && m._thread.length) ? m._thread : [m]).forEach(function (o) {
      (Array.isArray(o.attachment_names) ? o.attachment_names : []).forEach(function (n) {
        if (n && vidhNofn.indexOf(n) < 0) vidhNofn.push(n);
      });
    });
    const vidhFlis = vidhNofn.length
      ? vidhNofn.slice(0, 2).map(function (n) {
          return '<span class="gm-att">' + esc(String(n).replace(/\.[a-z0-9]+$/i, '').slice(0, 20)) + '</span>';
        }).join('') + (vidhNofn.length > 2 ? '<span class="gm-att">+' + (vidhNofn.length - 2) + '</span>' : '')
      : (m.has_attachment ? '<span class="gm-att">vi\u00F0hengi</span>' : '');
    // Merkin hans. Segi thau lokid thegir reiknada stadan - hans ord vinnur.
    // Malid a Thjonustubordinu, se thad til. Leitad i ollum thraedinum svo
    // samtal syni malid thott thad hafi verid stofnad af fyrsta skeytinu.
    const mal = (function () {
      const oll = (m._thread && m._thread.length) ? m._thread : [m];
      for (var z = 0; z < oll.length; z++) {
        var v = state.mal[String(oll[z].id)];
        if (v) return v;
      }
      return null;
    })();
    const MAL_STADA = { nytt: 'n\u00fdtt', i_vinnslu: '\u00ed vinnslu', tilbuid: 'tilb\u00fai\u00f0', lokad: 'loka\u00f0' };
    const merkiOll = merkiThradar(m);
    const merkiMin = merkiEigin(m);
    const merktLokid = merkiMin.some(function (n) { return /loki|b\u00fai|done/i.test(n); });
    const flisar = [
      stjarnaHtml(merkiOll),
      merkiMin.map(function (n) {
        return '<button class="gm-merki _rp-merki" data-m="' + esc(n) + '" type="button" title="S\u00eda \u00e1 \u00feetta merki">' + esc(n) + '</button>';
      }).join(''),
      tag ? '<span class="rp-tag ' + tag.cls + ' _rp-tagf" data-tag="' + esc(tag.label) + '" title="S\u00EDa \u00E1 \u00FEennan flokk">' + tag.label + '</span>' : '',
      (inbox && answered && !merktLokid) ? '<span class="gm-lokid">Loki\u00F0</span>' : '',
      (inbox && !answered && !merktLokid) ? '<span class="gm-bidur">B\u00ED\u00F0ur svars</span>' : '',
      vidhFlis,
      mal ? '<span class="gm-mal' + (mal.status === 'lokad' ? ' lokid' : '') + '">\ud83d\udccb #' + mal.id +
        ' \u00b7 ' + esc(MAL_STADA[mal.status] || mal.status || '') + '</span>' : '',
      isHidden(m) ? '<span class="gm-falid">fali\u00F0</span>' : '',
    ].filter(Boolean).join('');

    return '<div class="gm-row ' + cls + (opin ? ' opin' : '') + '" data-k="' + esc(m.threadKey) + '">' +
      '<div class="gm-av" style="background:' + litur + '">' + esc(staf) + '</div>' +
      '<div class="gm-mid">' +
        '<div class="gm-top"><span class="gm-from">' + fraTexti + '</span>' +
          '<span class="gm-time">' + esc(relDay(m.received_at)) + '</span></div>' +
        '<div class="gm-subj">' + esc(subj) + '</div>' +
        (snip ? '<div class="gm-snip">' + esc(snip.slice(0, 200)) + '</div>' : '') +
        (flisar ? '<div class="gm-chips">' + flisar + '</div>' : '') +
        (note ? '<div class="rp-note">\uD83D\uDCDD ' + esc(note) + '</div>' : '') +
        (opin
          ? '<div class="gm-opid">' +
              '<div class="gm-netfang">' + esc(m.from || '') + '</div>' +
              (mal
                ? '<div class="gm-malrod">\ud83d\udccb <b>M\u00e1l #' + mal.id + '</b> \u00b7 ' +
                    esc(MAL_STADA[mal.status] || mal.status || '') +
                    (mal.assigned_to ? ' \u00b7 ' + esc(mal.assigned_to) : '') +
                    (mal.archived_at ? ' \u00b7 \u00ed geymslu' : '') +
                    ' <button class="rp-btn _rp-bord" data-mal="' + mal.id + '" type="button">Opna \u00e1 bor\u00f0inu</button></div>'
                : '') +
              custHTML +
              (acts.length ? '<div class="rp-acts">' + acts.join('') + '</div>' : '') +
              svarHTML(m) +
              olderHTML +
            '</div>'
          : '') +
      '</div>' +
    '</div>';
  }

  // 21.09.2026 — SVARREITURINN I ROÐINNI. Sja haus: gamli modalinn var
  // "geimvera" ofan a sidunni. Her er svarid thar sem posturinn er.
  function svarHTML(m) {
    const s = state.svar[m.threadKey];
    if (!s) return '';
    const fra = postholfFyrir(m);
    return '<div class="gm-svar">' +
      '<input class="gm-svar-efni _rp-sv-efni" data-k="' + esc(m.threadKey) + '" value="' + esc(s.efni || '') + '">' +
      '<textarea class="gm-svar-texti _rp-sv-texti" data-k="' + esc(m.threadKey) + '" placeholder="Skrifa\u00f0u svar \u2014 e\u00f0a l\u00e1ttu Claude semja uppkast">' + esc(s.texti || '') + '</textarea>' +
      '<div class="gm-svar-fra">Fer fr\u00e1 <b>' + esc(fra) + '</b> \u00ed sama \u00fer\u00e6\u00f0i til ' + esc(m.from || '') + '</div>' +
      '<div class="rp-acts">' +
        '<button class="rp-btn ai _rp-sv-gen" data-k="' + esc(m.threadKey) + '" type="button"' + (s.bidur ? ' disabled' : '') + '>\u2728 Semja uppkast</button>' +
        '<button class="rp-btn prim _rp-sv-send" data-k="' + esc(m.threadKey) + '" type="button"' + (s.bidur ? ' disabled' : '') + '>\ud83d\udce4 Senda</button>' +
        '<button class="rp-btn _rp-sv-haetta" data-k="' + esc(m.threadKey) + '" type="button">H\u00e6tta vi\u00f0</button>' +
      '</div>' +
      (s.msg ? '<div class="gm-svar-msg ' + (s.cls || '') + '">' + esc(s.msg) + '</div>' : '') +
    '</div>';
  }
  // Ur hvada holfi svarid fer. Sama regla og sendReply notar: THAD HOLF SEM
  // TOK VID postinum, annars sjalfgefid. Annars fann gmail-send ekki thradinn.
  function postholfFyrir(m) {
    const p = String(m.account || '').trim();
    return /^(eldklar|bokhald)@eldklar\.is$/i.test(p) ? p : emailFrom();
  }

  // Tag-filter row: one coloured chip per category present in the current view,
  // each with its thread count. Click to filter; „Allir flokkar" clears it.
  function tagbarHTML() {
    const tc = tagCounts();
    const present = TAG_CATALOG.filter(t => tc[t.label]);
    const chips = present.map(t =>
      '<button class="rp-tagchip rp-tag ' + t.cls + (state.tagFilter === t.label ? ' on' : '') +
      '" data-tag="' + esc(t.label) + '" type="button">' + t.label +
      ' <span class="n">' + tc[t.label] + '</span></button>').join('');
    // 21.09.2026: Gmail-merkin i somu rod. Hans eigin merki fyrst, sidan
    // stjarnan - thad er rodin sem hann notar sjalfur til ad flokka.
    const mc = {}; let stjornur = 0;
    baseRows().forEach(function (m) {
      const l = Array.isArray(m.labels) ? m.labels : [];
      if (erStjornumerkt(l)) stjornur++;
      l.forEach(function (n) { if (!STJORNUR[n] && !MERKI_HULIN.test(n)) mc[n] = (mc[n] || 0) + 1; });
    });
    const merkiChips = Object.keys(mc).sort(function (a, b) { return mc[b] - mc[a]; }).map(function (n) {
      return '<button class="rp-tagchip merki' + (state.merki === n ? ' on' : '') +
        '" data-m="' + esc(n) + '" type="button">' + esc(n) +
        ' <span class="n">' + mc[n] + '</span></button>';
    }).join('') + (stjornur
      ? '<button class="rp-tagchip stjarna' + (state.merki === STJARNA ? ' on' : '') +
        '" data-m="' + STJARNA + '" type="button">' + STJARNA +
        ' <span class="n">' + stjornur + '</span></button>'
      : '');
    const clear = (state.tagFilter || state.merki)
      ? '<button class="rp-tagchip clearall" id="_rp-tagall" type="button">✕ Hreinsa</button>'
      : '';
    if (!chips && !merkiChips) return '';
    return '<div class="rp-tagbar">' +
      (chips ? '<span class="rp-tagbar-lbl">Flokkar:</span>' + chips : '') +
      (merkiChips ? '<span class="rp-tagbar-lbl">Merki:</span>' + merkiChips : '') +
      clear + '</div>';
  }

  // 21.09.2026 — ↻ SAEKIR POSTINN. Sja haus skriftunnar: takkinn las adeins
  // tofluna, en nyr postur berst i hana a tveggja klst fresti. Nu er innsogid
  // keyrt fyrst.
  //
  // Holfin tvo eru thau sem ERU tengd sem Gmail-reikningar. Vidbot her thegar
  // bokhald@brunaholf.is / Brunaholf@brunaholf.is verda tengd
  // (/api/google-auth?account=<netfang>) — annars svarar innsogid 409.
  const POSTHOLF = ['eldklar@eldklar.is', 'bokhald@eldklar.is'];
  const BH = 'https://brunaholf.netlify.app';
  let saekiNuna = false;
  async function saekjaNyjan() {
    if (saekiNuna) return;
    saekiNuna = true;
    const b = viewEl().querySelector('#_rp-reload');
    if (b) { b.disabled = true; b.classList.add('snyst'); }
    let nyir = 0, villa = null, tokst = 0;
    try {
      const koll = [];
      POSTHOLF.forEach(function (a) {
        ['', '&folder=sent'].forEach(function (f) {
          koll.push(fetch(BH + '/api/gmail-ingest?account=' + encodeURIComponent(a) + '&days=3' + f,
            { cache: 'no-store' })
            .then(function (r) { return r.json().catch(function () { return {}; }); })
            .then(function (d) {
              if (!d || d.error) { villa = (d && d.error) || villa; return; }
              tokst++;
              if (typeof d.nyir === 'number') nyir += d.nyir;
            })
            .catch(function (e) { villa = String((e && e.message) || e); }));
        });
      });
      await Promise.all(koll);
    } finally {
      saekiNuna = false;
      if (b) { b.disabled = false; b.classList.remove('snyst'); }
    }
    await load();
    // Segja satt: hafi innsogid brugdist er listinn adeins gamli lesturinn.
    const skilabod = tokst === 0
      ? ('\u26a0\ufe0f N\u00e1\u00f0i ekki \u00ed Gmail' + (villa ? ' (' + String(villa).slice(0, 80) + ')' : '') + ' \u2014 listinn er \u00f3breyttur')
      : (nyir > 0 ? ('\u2713 ' + nyir + ' n\u00fdr p\u00f3stur') : '\u2713 Enginn n\u00fdr p\u00f3stur');
    try { if (window.Toast && Toast.show) Toast.show(skilabod); } catch (_) {}
  }

  function render() {
    styles();
    const v = viewEl();
    const c = counts();
    const chip = (k, label, n) => '<button class="rp-chip' + (state.filter === k ? ' on' : '') + '" data-f="' + k + '" type="button">' + label + ' <span class="n">' + n + '</span></button>';

    let body;
    if (state.err) body = '<div class="rp-err">⚠️ ' + esc(state.err) + '</div>';
    else if (state.loading && !state.loaded) body = '<div class="rp-empty">Sæki pósta…</div>';
    else {
      const rows = currentRows();
      state._rows = rows;   // handlers below look up the message by data-i
      body = rows.length ? '<div class="rp-list">' + rows.map((m, i) => rowHTML(m, i)).join('') + '</div>'
        : '<div class="rp-empty">' + (state.search ? 'Enginn póstur passar við leitina.' : 'Engir póstar í þessum flokki.') + '</div>';
    }

    v.innerHTML =
      '<div class="rp-main">' +
        // 21.09.2026: leitin efst, ein lina, eins og i postholfi. Fyrirsognin
        // for (flipinn heitir "Postur" hvort sem er) og Endurhlada/Siur urdu takn.
        '<div class="rp-bar">' +
          '<div class="rp-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>' +
            '<input id="_rp-search" type="search" placeholder="Leita í pósti…" value="' + esc(state.search) + '"></div>' +
          '<button class="rp-ico" id="_rp-reload" type="button" title="Endurhlaða" aria-label="Endurhlaða">↻</button>' +
          '<button class="rp-ico" id="_rp-rules" type="button" title="Sjálfvirkar síur — fela sendendur, lén eða efni" aria-label="Síur">⚙️' + (state.rules && state.rules.length ? '<span class="n">' + state.rules.length + '</span>' : '') + '</button>' +
        '</div>' +
        '<div class="rp-tools">' +
          chip('inbox', '📥 Til að svara', c.inbox) +
          chip('unanswered', '⏳ Ósvarað', c.unanswered) +
          chip('sent', '🧾 Sendir reikningar', c.sent) +
          chip('all', 'Allt', c.all) +
          (c.hidden ? chip('hidden', '🗑 Falin', c.hidden) : '') +
          (c.filtered ? chip('filtered', '🔇 Síað', c.filtered) : '') +
          (state.tagFilter ? '<button class="rp-chip on" id="_rp-tagclear" type="button" title="Hreinsa flokkasíu">' + esc(state.tagFilter) + ' ✕</button>' : '') +
        '</div>' +
        tagbarHTML() +
        body +
      '</div>';

    v.querySelector('#_rp-reload').addEventListener('click', saekjaNyjan);
    // 21.09.2026: smellur a rodina opnar hana. Smellur a takka, tengil eda
    // merkiflis gerir sitt eigid verk og opnar ekki rodina lika.
    v.querySelectorAll('.gm-row').forEach(function (r) {
      r.addEventListener('click', function (ev) {
        if (ev.target.closest('button, a, input, textarea, select, .rp-tag, .rp-cust, .gm-opid')) return;
        const k = r.dataset.k;
        if (state.opin.has(k)) state.opin.delete(k); else state.opin.add(k);
        render();
      });
    });
    v.querySelectorAll('.rp-chip[data-f]').forEach(b => b.addEventListener('click', () => { state.filter = b.dataset.f; render(); }));
    const si = v.querySelector('#_rp-search');
    if (si) si.addEventListener('input', () => {
      state.search = si.value; render();
      const el = document.querySelector('#' + VIEW_ID + ' #_rp-search');
      if (el) { el.focus(); try { const n = el.value.length; el.setSelectionRange(n, n); } catch (_) {} }
    });
    v.querySelectorAll('.rp-cust[data-co],.rp-cust[data-kt],._rp-open').forEach(a => a.addEventListener('click', () => openCustomer(a.dataset.co, a.dataset.kt)));
    v.querySelectorAll('._rp-saga').forEach(b => b.addEventListener('click', () => openSaga(b.dataset.kt)));
    const rowFor = el => (state._rows || [])[+el.dataset.i];
    v.querySelectorAll('._rp-send').forEach(b => b.addEventListener('click', () => { const m = rowFor(b); if (m) openSendModal(m); }));
    v.querySelectorAll('._rp-edit').forEach(b => b.addEventListener('click', () => { const m = rowFor(b); if (m) editSale(m); }));
    // 21.09.2026: opnar svarreitinn i rodinni. Modalinn stendur afram fyrir
    // Thjonustubordid (368) og CRM-bordid (287) gegnum ReikningaPostur.replyTo.
    v.querySelectorAll('._rp-reply').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      const m = rowFor(b); if (!m) return;
      state.opin.add(m.threadKey);
      if (!state.svar[m.threadKey]) state.svar[m.threadKey] = { efni: 'Re: ' + String(m.subject || '').replace(/^\s*(re|sv|svar)\s*:\s*/i, ''), texti: '', msg: '' };
      render();
      const ta = viewEl().querySelector('.gm-row.opin .gm-svar-texti');
      if (ta) { ta.focus(); ta.scrollIntoView({ block: 'center' }); }
    }));
    // Innslattur skrifast i state svo hann lifi naestu teikningu af.
    v.querySelectorAll('._rp-sv-efni').forEach(el => el.addEventListener('input', () => {
      const s = state.svar[el.dataset.k]; if (s) s.efni = el.value;
    }));
    v.querySelectorAll('._rp-sv-texti').forEach(el => el.addEventListener('input', () => {
      const s = state.svar[el.dataset.k]; if (s) s.texti = el.value;
    }));
    v.querySelectorAll('._rp-sv-haetta').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation(); delete state.svar[b.dataset.k]; render();
    }));
    v.querySelectorAll('._rp-sv-gen').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation(); const m = malFyrirLykil(b.dataset.k); if (m) semjaInline(m);
    }));
    v.querySelectorAll('._rp-sv-send').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation(); const m = malFyrirLykil(b.dataset.k); if (m) sendaInline(m);
    }));
    v.querySelectorAll('._rp-del').forEach(b => b.addEventListener('click', () => { const m = rowFor(b); if (m) hideEmail(m); }));
    v.querySelectorAll('._rp-restore').forEach(b => b.addEventListener('click', () => { const m = rowFor(b); if (m) restoreEmail(m); }));
    v.querySelectorAll('._rp-mute').forEach(b => b.addEventListener('click', () => { const m = rowFor(b); if (m) muteSender(m); }));
    v.querySelectorAll('._rp-meta').forEach(b => b.addEventListener('click', () => { const m = rowFor(b); if (m) openTagModal(m); }));
    v.querySelectorAll('._rp-thread').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k; if (!k) return;
      if (state.expanded.has(k)) state.expanded.delete(k); else state.expanded.add(k);
      render();
    }));
    v.querySelectorAll('._rp-answered').forEach(b => b.addEventListener('click', async () => { const m = rowFor(b); if (m && m.message_id) { const ok = await logActivity(m.message_id, 'reply'); render(); if (window.Toast && Toast.show) Toast.show(ok ? '✓ Merkt svarað' : '⚠️ Merkingin „svarað" vistaðist EKKI á þjóninn — reyndu aftur eða athugaðu nettenginguna'); } }));
    v.querySelectorAll('._rp-tagf').forEach(b => b.addEventListener('click', () => { state.tagFilter = b.dataset.tag; state.filter = 'all'; render(); }));
    const tc = v.querySelector('#_rp-tagclear'); if (tc) tc.addEventListener('click', () => { state.tagFilter = null; render(); });
    // Tag-filter row — toggle the tag (click active chip to clear), keep the view chip.
    v.querySelectorAll('.rp-tagchip[data-tag]').forEach(b => b.addEventListener('click', () => {
      state.tagFilter = (state.tagFilter === b.dataset.tag) ? null : b.dataset.tag; render();
    }));
    const ta = v.querySelector('#_rp-tagall'); if (ta) ta.addEventListener('click', () => { state.tagFilter = null; state.merki = null; render(); });
    // Merkjaflisar - bædi i flisaroðinni og a sjalfri rodinni.
    // Bordid er eini stadurinn sem SKRIFAR stoduna - eitt mal, einn eigandi.
    // Hedan er adeins leitt thangad, med malid valid.
    v.querySelectorAll('._rp-bord').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      try { sessionStorage.setItem('bord_opna_mal', b.dataset.mal); } catch (_) {}
      location.hash = '#bord';
      if (window.App && App.switchView) App.switchView('bord');
    }));
    v.querySelectorAll('._rp-merki').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      state.merki = (state.merki === b.dataset.m) ? null : b.dataset.m; state.filter = 'all'; render();
    }));
    v.querySelectorAll('.rp-tagchip.merki, .rp-tagchip.stjarna').forEach(b => b.addEventListener('click', () => {
      state.merki = (state.merki === b.dataset.m) ? null : b.dataset.m; render();
    }));
    const rb = v.querySelector('#_rp-rules'); if (rb) rb.addEventListener('click', openRulesModal);
  }

  // ── delete / hide a handled email (Supabase-synced across devices) ─────────
  function threadIds(m) { return (m && m._threadIds && m._threadIds.length) ? m._threadIds : (m && m.message_id ? [m.message_id] : []); }
  // 17.09.2026: .upsert() kastar ekki. Áður hurfu póstarnir úr listanum og
  // „🗑 Póstur falinn" birtist — en þeir komu allir aftur við næstu hleðslu og
  // í hinum vélunum sáust þeir aldrei faldir.
  async function hideEmail(m) {
    const ids = threadIds(m); if (!ids.length) return;
    ids.forEach(id => state.hidden.add(id)); render();
    const SB = getSB();
    let err = SB ? null : new Error('enginn gagnagrunnstengill');
    if (SB) {
      try { const r = await SB.from('reikninga_postur_hidden').upsert(ids.map(id => ({ message_id: id })), { onConflict: 'message_id' }); err = r && r.error; }
      catch (e) { err = e; }
    }
    if (err) {
      ids.forEach(id => state.hidden.delete(id)); render();   // sýna þá aftur — þeir eru ekki faldir
      try { if (window.logProblem) window.logProblem('rp_hide_failed', ids.length + ' póstar: ' + String((err && err.message) || err)); } catch (_) {}
      if (window.Toast && Toast.show) Toast.show('⚠️ Tókst ekki að fela — pósturinn er enn í listanum. Reyndu aftur.');
      return;
    }
    if (window.Toast && Toast.show) Toast.show(ids.length > 1 ? '🗑 ' + ids.length + ' póstar faldir' : '🗑 Póstur falinn');
  }
  // 17.09.2026: mistókst afturköllunin þagði kerfið — pósturinn birtist á skjánum
  // en var enn falinn á þjóninum og hvarf aftur við næstu hleðslu.
  async function restoreEmail(m) {
    const ids = threadIds(m); if (!ids.length) return;
    ids.forEach(id => state.hidden.delete(id)); render();
    const SB = getSB();
    let err = SB ? null : new Error('enginn gagnagrunnstengill');
    if (SB) {
      try { const r = await SB.from('reikninga_postur_hidden').delete().in('message_id', ids); err = r && r.error; }
      catch (e) { err = e; }
    }
    if (err) {
      ids.forEach(id => state.hidden.add(id)); render();      // hann er enn falinn á þjóninum
      try { if (window.logProblem) window.logProblem('rp_restore_failed', ids.length + ' póstar: ' + String((err && err.message) || err)); } catch (_) {}
      if (window.Toast && Toast.show) Toast.show('⚠️ Tókst ekki að endurheimta póstinn — hann er enn falinn. Reyndu aftur.');
    }
  }

  // ── auto-hide rules (síur) — sender / domain / subject, Supabase-synced ─────
  async function addRule(rule_type, pattern) {
    pattern = String(pattern || '').trim().toLowerCase();
    if (!pattern) return;
    if ((state.rules || []).some(r => r.rule_type === rule_type && String(r.pattern).toLowerCase() === pattern)) return; // dup
    const optimistic = { id: 'tmp:' + rule_type + ':' + pattern, rule_type, pattern };
    state.rules = [optimistic, ...(state.rules || [])];
    render();
    const SB = getSB();
    // 17.09.2026: .insert() kastar ekki. Áður sat bráðabirgðasían (tmp:) eftir í
    // listanum og „🔇 Sía bætt við" birtist — hún faldi ekkert eftir næstu hleðslu.
    let err = SB ? null : new Error('enginn gagnagrunnstengill');
    if (SB) {
      try {
        const r = await SB.from('reikninga_postur_rules').insert({ rule_type, pattern }).select().maybeSingle();
        err = r && r.error;
        if (!err && r && r.data) { state.rules = state.rules.map(x => x.id === optimistic.id ? r.data : x); }
      } catch (e) { err = e; }
    }
    if (err) {
      state.rules = (state.rules || []).filter(x => x.id !== optimistic.id);   // sían varð ekki til
      render();
      try { if (window.logProblem) window.logProblem('rp_rule_add_failed', rule_type + ' ' + pattern + ': ' + String((err && err.message) || err)); } catch (_) {}
      if (window.Toast && Toast.show) Toast.show('⚠️ Sían vistaðist EKKI — hún felur ekkert. Reyndu aftur.');
      return;
    }
    if (window.Toast && Toast.show) Toast.show('🔇 Sía bætt við');
  }
  // 17.09.2026: mistókst eyðingin hvarf sían aðeins af skjánum — hún hélt áfram
  // að fela pósta á þjóninum og kom aftur við næstu hleðslu.
  async function removeRule(id) {
    const fyrri = (state.rules || []).filter(r => String(r.id) === String(id));
    state.rules = (state.rules || []).filter(r => String(r.id) !== String(id));
    render();
    const SB = getSB();
    if (String(id).indexOf('tmp:') === 0) return;   // aldrei vistuð — ekkert að eyða
    let err = SB ? null : new Error('enginn gagnagrunnstengill');
    if (SB) {
      try { const r = await SB.from('reikninga_postur_rules').delete().eq('id', id); err = r && r.error; }
      catch (e) { err = e; }
    }
    if (err) {
      state.rules = fyrri.concat(state.rules || []);   // sían er enn virk á þjóninum
      render();
      try { if (window.logProblem) window.logProblem('rp_rule_del_failed', 'id ' + id + ': ' + String((err && err.message) || err)); } catch (_) {}
      if (window.Toast && Toast.show) Toast.show('⚠️ Sían var EKKI fjarlægð — hún felur enn pósta. Reyndu aftur.');
    }
  }
  function muteSender(m) {
    const from = (m.from || '').toLowerCase().trim();
    if (!from) return;
    if (confirm('Fela sjálfkrafa ALLA pósta frá ' + from + '?\n\n(Þú getur afturkallað í ⚙️ Síur.)')) addRule('sender', from);
  }

  function openRulesModal() {
    const RULE_LABEL = { sender: '👤 Sendandi', domain: '🌐 Lén', subject: '📝 Efni inniheldur' };
    function rulesListHTML() {
      const rules = state.rules || [];
      if (!rules.length) return '<div class="rpm-note" style="margin:0">Engar síur enn. Bættu við hér að neðan, eða smelltu á 🔇 við póst til að fela sendanda.</div>';
      return rules.map(r => {
        const n = state.emails.filter(m => {
          const from = (m.from || '').toLowerCase(); const dom = from.split('@')[1] || ''; const subj = (m.subject || '').toLowerCase(); const p = String(r.pattern).toLowerCase();
          return r.rule_type === 'sender' ? from === p : r.rule_type === 'domain' ? (dom === p || dom.endsWith('.' + p) || from.endsWith('@' + p)) : subj.indexOf(p) !== -1;
        }).length;
        return '<div class="rpm-doc"><span class="n">' + (RULE_LABEL[r.rule_type] || r.rule_type) + '</span>' +
          '<span class="meta" style="color:#11141c;margin-left:8px">' + esc(r.pattern) + '</span>' +
          '<span class="meta">felur ' + n + '</span>' +
          '<button class="rpm-doc-send _rr-del" data-id="' + esc(String(r.id)) + '" type="button" style="background:#fef2f2;border-color:#fecaca;color:#dc2626">✕ Fjarlægja</button></div>';
      }).join('');
    }
    openModal(
      '<div class="rpm-head"><div><h3>⚙️ Síur — fela óæskilega pósta</h3><div class="sub">Sjálfvirkar reglur samstillast milli tækja</div></div><button class="rpm-x" type="button">✕</button></div>' +
      '<div class="rpm-body">' +
        '<div class="rpm-row"><label class="rpm-lbl">Virkar síur</label><div class="rpm-docs" id="_rr-list">' + rulesListHTML() + '</div></div>' +
        '<div class="rpm-row"><label class="rpm-lbl">Bæta við síu</label>' +
          '<div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center">' +
            '<select id="_rr-type" style="height:38px;border:1px solid #cbd5e1;border-radius:9px;padding:0 8px;font:inherit;font-size:13px;background:#fff;color:#11141c">' +
              '<option value="sender">👤 Sendandi (netfang)</option>' +
              '<option value="domain">🌐 Lén (t.d. rsk.is)</option>' +
              '<option value="subject">📝 Efni inniheldur</option>' +
            '</select>' +
            '<input id="_rr-pattern" type="text" placeholder="t.d. noreply@rsk.is / rsk.is / áreiðanleikakönnun" style="flex:1;min-width:200px">' +
            '<button class="rpm-btn prim" id="_rr-add" type="button">Bæta við</button>' +
          '</div>' +
          '<div class="rpm-note" style="margin:8px 0 0">Póstar sem passa hverfa úr listunum og lenda undir „🔇 Síað". Ekkert er eytt varanlega.</div>' +
        '</div>' +
      '</div>' +
      '<div class="rpm-foot"><span class="spacer"></span><button class="rpm-btn" type="button" id="_rr-close">Loka</button></div>'
    );
    const card = modalEl();
    const refresh = () => { const l = card.querySelector('#_rr-list'); if (l) l.innerHTML = rulesListHTML(); bindDel(); };
    const bindDel = () => card.querySelectorAll('._rr-del').forEach(b => b.addEventListener('click', async () => { await removeRule(b.dataset.id); refresh(); }));
    card.querySelector('.rpm-x').onclick = closeModal;
    card.querySelector('#_rr-close').onclick = closeModal;
    card.querySelector('#_rr-add').onclick = async () => {
      const t = card.querySelector('#_rr-type').value;
      const p = card.querySelector('#_rr-pattern').value;
      if (!String(p || '').trim()) return;
      await addRule(t, p);
      card.querySelector('#_rr-pattern').value = '';
      refresh();
    };
    card.querySelector('#_rr-pattern').addEventListener('keydown', e => { if (e.key === 'Enter') card.querySelector('#_rr-add').click(); });
    bindDel();
  }

  // 🏷️ Merkja — set a manual flokk (t.d. „Senda kröfu") + write a minnispunktur.
  function openTagModal(m) {
    const mm = metaFor(m) || {};
    let picked = mm.manual_tag || '';
    const chip = t => '<button class="rpm-tagchip rp-tag ' + t.cls + (picked === t.label ? ' on' : '') +
      '" data-tag="' + esc(t.label) + '" type="button">' + t.label + '</button>';
    openModal(
      '<div class="rpm-head"><div><h3>🏷️ Merkja póst</h3><div class="sub">' + esc(m.sender_name || m.from) + (m.subject ? ' · ' + esc(m.subject) : '') + '</div></div><button class="rpm-x" type="button">✕</button></div>' +
      '<div class="rpm-body">' +
        '<div class="rpm-row"><label class="rpm-lbl">Flokkur (handvirkt — kemur í stað sjálfvirka)</label>' +
          '<div class="rpm-tags" id="_rpm-tags">' + TAG_CATALOG.map(chip).join('') + '</div>' +
          '<div class="rpm-note" style="margin:8px 0 0">Smelltu á virkan flokk til að hreinsa hann (fer þá aftur í sjálfvirkt).</div>' +
        '</div>' +
        '<div class="rpm-row"><label class="rpm-lbl">📝 Minnispunktur</label>' +
          '<textarea id="_rpm-metanote" placeholder="Skrifaðu nótu — t.d. „bíð eftir kt", „senda kröfu í næstu viku"…">' + esc(mm.note || '') + '</textarea></div>' +
      '</div>' +
      '<div class="rpm-foot"><span class="rpm-msg" id="_rpm-metamsg"></span><button class="rpm-btn" type="button" id="_rpm-metacancel">Hætta við</button><button class="rpm-btn prim" type="button" id="_rpm-metasave">💾 Vista</button></div>'
    );
    const card = modalEl();
    const paint = () => card.querySelectorAll('.rpm-tagchip').forEach(b =>
      b.classList.toggle('on', b.dataset.tag === picked));
    card.querySelectorAll('.rpm-tagchip').forEach(b => b.addEventListener('click', () => {
      picked = (picked === b.dataset.tag) ? '' : b.dataset.tag; paint();
    }));
    card.querySelector('.rpm-x').onclick = closeModal;
    card.querySelector('#_rpm-metacancel').onclick = closeModal;
    card.querySelector('#_rpm-metasave').onclick = async () => {
      const note = card.querySelector('#_rpm-metanote').value;
      const btn = card.querySelector('#_rpm-metasave'); btn.disabled = true;
      const ok = await saveMeta(m.message_id, picked, note);
      // 17.09.2026: glugganum var alltaf lokað og „Vistað" sagt. Mistókst vistun
      // tapaðist nótan sem notandinn var nýbúinn að skrifa — nú helst hann opinn.
      if (!ok) {
        btn.disabled = false;
        const msg = card.querySelector('#_rpm-metamsg');
        if (msg) { msg.style.color = '#dc2626'; msg.textContent = 'Merki og nóta vistuðust EKKI — reyndu aftur.'; }
        if (window.Toast && Toast.show) Toast.show('⚠️ Merki/nóta vistaðist ekki');
        return;
      }
      closeModal(); render();
      if (window.Toast && Toast.show) Toast.show('🏷️ Vistað');
    };
  }

  function openCustomer(coId, kt) {
    if (coId && window.Companies && Companies.openDetail) {
      if (window.App && App.switchView) App.switchView('companies');
      setTimeout(() => { try { Companies.openDetail(+coId); } catch (_) {} }, 60);
      return;
    }
    openSaga(kt);
  }
  function openSaga(kt) {
    kt = ktDigits(kt);
    try { if (window.App && App.switchView) App.switchView('hreyfingarlisti'); } catch (_) {}
    if (kt) setTimeout(() => { try { location.hash = '#hreyfingarlisti/' + kt; } catch (_) {} }, 80);
  }

  // ── Tier 2: ✏️ Breyta reikningi → open the sale in the sale editor (patch 142)
  function editSale(m) {
    try {
      if (m.sale && window.SaleEditor) {
        if (m.sale.id != null && SaleEditor.openById) return void SaleEditor.openById(m.sale.id);
        if (m.sale.num && SaleEditor.openByNum) return void SaleEditor.openByNum(m.sale.num);
      }
    } catch (_) {}
    // no specific invoice matched → drop the office on the customer so they pick it
    openCustomer(m.cust && m.cust.coId, m.cust && m.cust.kt);
  }

  // ── shared modal shell ────────────────────────────────────────────────────
  function modalEl() {
    let el = document.getElementById('_rp-modal');
    if (el) return el;
    el = document.createElement('div');
    el.id = '_rp-modal'; el.style.display = 'none';
    el.innerHTML = '<div class="rpm-back"></div><div class="rpm-card"></div>';
    document.body.appendChild(el);
    el.querySelector('.rpm-back').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    return el;
  }
  function openModal(html) { const el = modalEl(); el.querySelector('.rpm-card').innerHTML = html; el.style.display = 'flex'; return el.querySelector('.rpm-card'); }
  function closeModal() { const el = document.getElementById('_rp-modal'); if (el) el.style.display = 'none'; }

  function blobToB64(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => { const s = String(fr.result || ''); const i = s.indexOf(','); res(i >= 0 ? s.slice(i + 1) : s); };
      fr.onerror = rej; fr.readAsDataURL(blob);
    });
  }
  // 19.09.2026 — SJÁLFGEFNA HÓLFIÐ VERÐUR AÐ VERA TENGT. Hér stóð
  // reikningar@eldklar.is, sem er ekki tengt Gmail-hólf: appSend hunsaði það og
  // sendi úr sínu sjálfgefna hólfi meðan yfirferðin sýndi reikningar@. Notandinn
  // sá því annað en hann fékk. Agnar: „ef þú getur bara valið eitt, veldu þá
  // eldklar@eldklar" — 99% fyrirspurna berast þangað. Geymt gildi er virt EF það
  // er tengt hólf, annars sleppt fremur en að birta netfang sem verður ekki notað.
  const TENGD_HOLF = /^(eldklar|bokhald)@eldklar\.is$/i;
  const SJALFGEFID_FRA = 'Brunahólf slökkvitæki ehf <eldklar@eldklar.is>';
  function emailFrom() {
    const geymt = localStorage.getItem('email_from') || '';
    const netfang = (geymt.match(/<([^>]+)>/) || [null, geymt.trim()])[1] || '';
    return TENGD_HOLF.test(netfang) ? geymt : SJALFGEFID_FRA;
  }
  function fmtKr(n) { return (Math.round(Number(n) || 0)).toLocaleString('is-IS') + ' kr'; }

  async function getFullSale(id) {
    const SB = getSB(); if (!SB || id == null) return null;
    try { const r = await SB.from('solur').select('*').eq('id', id).maybeSingle(); return (r && r.data) || null; } catch (_) { return null; }
  }
  /* 19.09.2026 — ÞESSI LEIT FANN ALDREI NEITT.
   * Hér stóð `.eq('customer_kt', ktDigits(kt))`, þ.e. leitað var að kennitölu ÁN
   * bandstriks. Mæld geymsla í `solur.customer_kt`: 843 raðir MEÐ bandstriki,
   * 0 án, 21 tóm (af 864). Jafnaðarmerkið gat því aldrei staðist og glugginn
   * sagði „Engir reikningar fundust" um hvern einasta kúnna.
   *
   * Nú eru bæði form kennitölunnar reynd OG kúnnalyklarnir, sem eru
   * áreiðanlegri en strengur. `co` er fyrirtaeki.id (m.cust.coId) og `base` er
   * customers_base.id þegar hann er til.
   */
  async function getCustomerInvoices(kt, co, base) {
    const SB = getSB();
    const k = ktDigits(kt);
    if (!SB) return [];
    const strik = k && k.length === 10 ? k.slice(0, 6) + '-' + k.slice(6) : null;
    const skil = [];
    if (k) skil.push('customer_kt.eq.' + k);
    if (strik) skil.push('customer_kt.eq.' + strik);
    if (co != null && co !== '') skil.push('customer_id.eq.' + co);
    if (base != null && base !== '') skil.push('customer_base_id.eq.' + base);
    if (!skil.length) return [];
    const r = await SB.from('solur').select('*').or(skil.join(','))
      .order('created_at', { ascending: false }).limit(40);
    // Villa er EKKI sama og „enginn reikningur". Áður gleypti catch hvort tveggja
    // og hvort um sig leit út eins og tómur listi.
    if (r.error) throw r.error;
    const sed = new Set(), ut = [];
    (r.data || []).forEach(s => { if (s && !sed.has(s.id)) { sed.add(s.id); ut.push(s); } });
    return ut;
  }
  /* 19.09.2026 — SKJÖL FÉLAGSINS (úttektarskýrslur, eldri reikningar, samningar).
   * `customer_documents` geymir þau með `drive_file_id`, og /api/email-send leysir
   * `{ filename, driveId }` í base64 þjónsmegin. Skjölin þurfa því enga nýja leið.
   * Aðeins raðir MEÐ drive_file_id eru sýndar: hinar er ekki hægt að hengja við,
   * og valmöguleiki sem virkar ekki er verri en enginn.
   */
  const DOC_HEITI = { uttektarskyrsla: 'Úttektarskýrsla', reikningur: 'Reikningur', samningur: 'Samningur', brunakerfi: 'Brunakerfi' };
  async function getCustomerDocs(coId, baseId) {
    const SB = getSB();
    if (!SB) return [];
    const skil = [];
    if (coId != null && coId !== '') skil.push('fyrirtaeki_id.eq.' + coId);
    if (baseId != null && baseId !== '') skil.push('customer_base_id.eq.' + baseId);
    if (!skil.length) return [];
    const r = await SB.from('customer_documents')
      .select('id,doc_type,year,doc_date,invoice_number,file_name,drive_file_id,amount')
      .or(skil.join(','))
      .not('drive_file_id', 'is', null)
      .order('doc_date', { ascending: false, nullsFirst: false })
      .limit(60);
    // Villa er ekki sama og „engin skjöl" — hún á að sjást.
    if (r.error) throw r.error;
    return r.data || [];
  }
  function docHeiti(d) {
    const teg = DOC_HEITI[d.doc_type] || d.doc_type || 'Skjal';
    const ar = d.year || (d.doc_date ? String(d.doc_date).slice(0, 4) : '');
    const nr = d.invoice_number ? ' ' + d.invoice_number : '';
    return teg + nr + (ar ? ' ' + ar : '');
  }
  function docSkraarnafn(d) {
    if (d.file_name) return String(d.file_name).replace(/[\\/:*?"<>|]/g, '-');
    return docHeiti(d).replace(/\s+/g, ' ').trim() + '.pdf';
  }
  async function coForSale(sale, m) {
    const SB = getSB();
    const coId = m && m.cust && m.cust.coId;
    if (SB && coId != null) {
      try { const r = await SB.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang').eq('id', coId).maybeSingle(); if (r && r.data) return r.data; } catch (_) {}
    }
    return { nafn: (sale && sale.customer_nafn) || (m && m.cust && m.cust.name) || '', kennitala: (m && m.cust && m.cust.kt) || (sale && sale.customer_kt) || '', heimilisfang: '' };
  }

  // ── Tier 2: ✉️ Senda reikning — resend an invoice PDF to any address ────────
  async function openSendModal(m) {
    openModal('<div class="rpm-load">Sæki reikninga…</div>');
    let invs = [];
    // 19.09.2026: kúnnalyklarnir fylgja með — kennitölustrengur einn og sér er
    // ekki áreiðanlegur (og var auk þess borinn saman á röngu formi, sjá ofar).
    const kt = m.cust && m.cust.kt;
    const coId = m.cust && m.cust.coId;
    const baseId = m.cust && (m.cust.baseId != null ? m.cust.baseId : m.cust.customer_base_id);
    let leitVilla = null;
    if (kt || coId != null || baseId != null) {
      try { invs = await getCustomerInvoices(kt, coId, baseId); }
      catch (e) { leitVilla = (e && e.message) || String(e); }
    }
    if (m.sale && !invs.some(s => String(s.id) === String(m.sale.id))) invs.unshift(m.sale);
    // fyrst ógreiddir reikningur-sölur, svo eftir dagsetningu (nýjast fyrst)
    invs = invs.filter(s => s && s.num);
    // 19.09.2026: skjöl félagsins með — úttektarskýrslan er oft það sem vantar.
    let docs = [], docVilla = null;
    try { docs = await getCustomerDocs(coId, baseId); }
    catch (e) { docVilla = (e && e.message) || String(e); }
    const preId = m.sale ? String(m.sale.id) : (invs[0] ? String(invs[0].id) : '');
    renderSendModal(m, invs, preId, docs, leitVilla, docVilla);
  }
  // Uppkast að svari. Forskrifað svo ekki þurfi að byrja á auðu blaði, en það
  // er UPPKAST — reiturinn er opinn og textinn fer ekki óskoðaður.
  function uppkast(m, sale) {
    // `sender_name` er stundum netfangið sjálft (mælt: „Sæl(l)
    // hussjodurinn@hussjodurinn.is,"). Nafn sem inniheldur @ eða punkt á
    // undan léni er ekki nafn — þá er hlutlaus kveðja réttari en röng.
    const hrátt = String(m.sender_name || '').trim();
    const nafn = (!hrátt || hrátt.indexOf('@') >= 0) ? '' : hrátt.split(/\s+/)[0];
    const kvedja = nafn ? 'Sæl(l) ' + nafn + ',' : 'Góðan daginn,';
    const hvad = sale && sale.num ? 'reikningur ' + sale.num : 'umbeðin skjöl';
    return kvedja + '\n\nMeðfylgjandi er ' + hvad + ' eins og beðið var um.' +
      '\n\nKveðja,\nBrunahólf Slökkvitæki ehf.';
  }
  function renderSendModal(m, invs, selId, docs, leitVilla, docVilla) {
    docs = docs || [];
    const to = m.from || '';
    const invRows = invs.length ? invs.map(s =>
      '<label class="rpm-inv' + (String(s.id) === selId ? ' sel' : '') + '" data-id="' + esc(String(s.id)) + '">' +
        '<input type="radio" name="rpinv" value="' + esc(String(s.id)) + '"' + (String(s.id) === selId ? ' checked' : '') + '>' +
        '<span class="n">' + esc(s.num || '—') + '</span>' +
        '<span class="meta">' + fmtKr(s.samtals) + '<br>' + esc(fmtDate(s.created_at)) + (s.paid_at ? ' · <span class="paid">greitt</span>' : '') + '</span>' +
      '</label>'
    ).join('') : '<div class="rpm-note" style="margin:0">' + (leitVilla
        ? '⚠ Náði ekki í reikningana: ' + esc(leitVilla)
        : 'Engir reikningar fundust á þennan viðskiptavin.') + '</div>';
    // Skjöl félagsins — fjölval. Aðeins þau sem hægt er að hengja við (drive_file_id).
    const docRows = docs.length ? docs.map(d =>
      '<label class="rpm-doc"><input type="checkbox" name="rpdoc" value="' + esc(String(d.id)) + '">' +
        '<span class="n">' + esc(docHeiti(d)) + '</span>' +
        '<span class="meta">' + esc(d.doc_date ? fmtDate(d.doc_date) : (d.year || '')) + '</span>' +
        // 20.09.2026 — Agnar: „þyrfti að geta séð preview þarna. Treysti ekki neinu".
        // Skjalið var aðeins nafn á lista. Nú opnast það sjálft.
        (d.drive_file_id ? '<a class="rpm-opna" href="https://drive.google.com/file/d/' + esc(String(d.drive_file_id)) + '/view" target="_blank" rel="noopener">Opna</a>' : '') +
      '</label>').join('')
      : '<div class="rpm-note" style="margin:0">' + (docVilla
          ? '⚠ Náði ekki í skjölin: ' + esc(docVilla)
          : 'Engin skjöl með viðhengi fundust á félaginu.') + '</div>';

    openModal(
      '<div class="rpm-head"><div><h3>✉️ Senda skjöl</h3><div class="sub">' + esc((m.cust && m.cust.name) || m.sender_name || '') + '</div></div><button class="rpm-x" type="button">✕</button></div>' +
      '<div class="rpm-body">' +
        '<div class="rpm-row"><label class="rpm-lbl">Senda á netfang</label><input id="_rpm-to" type="email" value="' + esc(to) + '" placeholder="netfang@daemi.is"></div>' +
        '<div class="rpm-row"><label class="rpm-lbl">Reikningur (valkvæmt — teiknaður sem PDF)</label><div class="rpm-invs">' + invRows + '</div>' +
          (invs.length ? '<label class="rpm-inv" data-id=""><input type="radio" name="rpinv" value=""><span class="n">— enginn reikningur</span><span class="meta">aðeins skjölin hér að neðan</span></label>' : '') + '</div>' +
        '<div class="rpm-row"><label class="rpm-lbl">Skjöl félagsins</label><div class="rpm-invs rpm-docs">' + docRows + '</div></div>' +
        '<div class="rpm-row"><label class="rpm-lbl">Skilaboð</label><textarea id="_rpm-note">' + esc(uppkast(m, invs.find(s => String(s.id) === selId))) + '</textarea></div>' +
      '</div>' +
      '<div class="rpm-foot"><span class="rpm-msg" id="_rpm-msg"></span><button class="rpm-btn" type="button" id="_rpm-cancel">Hætta við</button><button class="rpm-btn prim" type="button" id="_rpm-send">Undirbúa sendingu ›</button></div>'
    );
    const card = modalEl();
    card.querySelector('.rpm-x').onclick = closeModal;
    card.querySelector('#_rpm-cancel').onclick = closeModal;
    card.querySelectorAll('.rpm-inv').forEach(l => l.addEventListener('click', () => {
      card.querySelectorAll('.rpm-inv').forEach(x => x.classList.remove('sel'));
      l.classList.add('sel'); const r = l.querySelector('input'); if (r) r.checked = true;
    }));
    // 19.09.2026: EKKI SENT STRAX. Fyrst er sendingin byggð og sýnd.
    card.querySelector('#_rpm-send').onclick = () => undirbua(m, invs, docs);
    setTimeout(() => { const t = card.querySelector('#_rpm-to'); if (t && !t.value) t.focus(); }, 80);
  }
  function buildEmailHtml(sale, co, note) {
    const noteHtml = note ? '<p style="color:#334155;font-size:13.5px;white-space:pre-wrap;margin:0 0 14px">' + esc(note) + '</p>' : '';
    return '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
      '<body style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:22px;color:#0f172a">' +
      '<div style="background:#C93C1D;padding:16px 20px;border-radius:10px 10px 0 0"><h1 style="margin:0;color:#fff;font-size:18px">Brunahólf Slökkvitæki ehf</h1>' +
      '<p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:13px">Reikningur ' + esc(sale.num || '') + '</p></div>' +
      '<div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 10px 10px">' +
        '<p style="color:#334155;font-size:13.5px;margin:0 0 14px">Sæl/l,</p>' +
        noteHtml +
        '<p style="color:#334155;font-size:13.5px;margin:0 0 14px">Meðfylgjandi er reikningur <strong>' + esc(sale.num || '') + '</strong>' +
          (co && co.nafn ? ' fyrir ' + esc(co.nafn) : '') + ', að upphæð <strong>' + fmtKr(sale.samtals) + '</strong>.</p>' +
        '<p style="color:#64748b;font-size:12.5px;margin:18px 0 0">Kær kveðja,<br><strong>Brunahólf Slökkvitæki ehf</strong><br>eldklar@eldklar.is</p>' +
      '</div></body></html>';
  }
  /* 19.09.2026 — TVÖ ÞREP. Agnar: „Ekki senda strax."
   * `undirbua` byggir sendinguna og SÝNIR hana: viðtakanda, efni, viðhengi og
   * texta. Fyrst þá birtist „Senda núna". Sending er aðgerð sem ekki verður
   * tekin til baka; hún á að krefjast þess að vera lesin fyrst.
   */
  async function undirbua(m, invs, docs) {
    const card = modalEl();
    const msg = card.querySelector('#_rpm-msg');
    const btn = card.querySelector('#_rpm-send');
    const setMsg = (x, c) => { msg.textContent = x; msg.className = 'rpm-msg ' + (c || ''); };
    const to = (card.querySelector('#_rpm-to').value || '').trim();
    const note = (card.querySelector('#_rpm-note').value || '').trim();
    const sel = card.querySelector('input[name=rpinv]:checked');
    const valdir = [...card.querySelectorAll('input[name=rpdoc]:checked')].map(x => x.value);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { setMsg('Skráðu gilt netfang', 'bad'); return; }
    const saleId = sel && sel.value ? sel.value : null;
    if (!saleId && !valdir.length) { setMsg('Veldu reikning eða að minnsta kosti eitt skjal', 'bad'); return; }
    btn.disabled = true;
    try {
      const attachments = [];
      let sale = null, co = null;
      if (saleId) {
        if (!window.UttektInvoicePdf || !UttektInvoicePdf.buildInvoiceBlob) throw new Error('PDF-teiknari ekki tiltækur');
        setMsg('Teikna reikning…', '');
        sale = invs.find(s => String(s.id) === saleId);
        const full = await getFullSale(saleId);
        if (full) sale = full;
        co = await coForSale(sale, m);
        const blob = await UttektInvoicePdf.buildInvoiceBlob(sale, co);
        const b64 = await blobToB64(blob);
        const fname = [(co.nafn || 'reikningur').replace(/\s+/g, ' ').trim(), sale.num || ''].filter(Boolean).join(' - ') + '.pdf';
        attachments.push({ filename: fname, content: b64 });
      }
      // Skjölin fara sem Drive-tilvísun; email-send sækir þau þjónsmegin.
      (docs || []).filter(d => valdir.indexOf(String(d.id)) >= 0).forEach(d => {
        attachments.push({ filename: docSkraarnafn(d), driveId: d.drive_file_id });
      });
      if (!co) co = await coForSale(null, m);
      let efni = sale && sale.num ? 'Reikningur ' + sale.num + ' frá Brunahólf Slökkvitæki ehf'
        : 'Umbeðin skjöl frá Brunahólf Slökkvitæki ehf';
      // Svar heldur efni fyrirspurnarinnar með „Re:" — Message-ID eitt og sér
      // dugar ekki alls staðar til að þræða.
      if (m.message_id && m.subject) {
        const hreint = String(m.subject).replace(/^((re|sv|svar|fw|fwd|áfram)\s*:\s*)+/i, '').trim();
        if (hreint) efni = 'Re: ' + hreint;
      }
      const payload = {
        // 19.09.2026 — SVARA ÚR ÞVÍ HÓLFI SEM FÉKK PÓSTINN.
        // `emailFrom()` skilar reikningar@eldklar.is sem er EKKI tengt hólf, svo
        // `appSend` féll á sjálfgefna hólfið (eldklar@). Beiðni sem kom á bokhald@
        // fékk því svar frá eldklar@ — öðru netfangi en hún skrifaði á, og þá sér
        // viðtakandinn ókunnugan sendanda. `m.account` er hólfið sem TÓK VIÐ
        // póstinum. `appSend` tekur aðeins við eldklar@/bokhald@ og fellur sjálft
        // aftur í sjálfgefið berist annað, svo þetta getur ekki sent úr ótengdu hólfi.
        from: (/^(eldklar|bokhald)@eldklar\.is$/i.test(String(m.account || ''))
          ? 'Brunahólf slökkvitæki ehf <' + m.account + '>' : emailFrom()),
        to: [to], subject: efni,
        html: buildEmailHtml(sale, co, note),
        attachments: attachments,
        // 19.09.2026 — SVAR, ekki nýr póstur. Message-ID upprunalega póstsins fer
        // með, svo svarið lendi undir fyrirspurninni hjá viðtakanda í stað þess
        // að birtast sem ótengt erindi frá eldklar@eldklar.is.
        inReplyTo: m.message_id || undefined,
        apiKey: localStorage.getItem('resend_api_key') || undefined,
      };
      synaStadfestingu(m, payload, note);
    } catch (e) {
      btn.disabled = false;
      setMsg('Tókst ekki að undirbúa: ' + ((e && e.message) || e), 'bad');
    }
  }
  function synaStadfestingu(m, payload, note) {
    // 20.09.2026 — FORSKOÐUN Á ÞVÍ SEM FER. Hvert viðhengi opnast: Drive-skjal
    // beint úr Drive, og reikningurinn úr ÞEIM base64-bætum sem fara í póstinn
    // (ekki teiknaður upp á nýtt). Sjáist það hér er það það sem berst.
    const vidh = (payload.attachments || []).map((a, i) =>
      '<li>' + esc(a.filename) +
        (a.driveId ? ' <span class="meta">· úr Drive</span> <a class="rpm-opna" href="https://drive.google.com/file/d/' + esc(String(a.driveId)) + '/view" target="_blank" rel="noopener">Skoða</a>'
          : ' <span class="meta">· teiknaður núna</span> <button type="button" class="rpm-opna" data-vidh="' + i + '">Skoða</button>') +
      '</li>').join('');
    openModal(
      '<div class="rpm-head"><div><h3>📤 Yfirfara áður en sent er</h3><div class="sub">' + esc((m.cust && m.cust.name) || m.sender_name || '') + '</div></div><button class="rpm-x" type="button" aria-label="Loka">✕</button></div>' +
      '<div class="rpm-body">' +
        '<div class="rpm-row"><label class="rpm-lbl">Viðtakandi</label><div>' + esc(payload.to.join(', ')) + (payload.inReplyTo ? '<div class="meta">↩ svar í sama þræði — lendir undir fyrri póstinum</div>' : '<div class="meta">⚠ nýr póstur — ekki svar (Message-ID vantar)</div>') + '</div></div>' +
        // 19.09.2026 — SÝNA SENDANDANN. Agnar: „En rangur tölvupóstur þarna."
        // Sendandinn var lagaður (svarið fer úr hólfinu sem tók við póstinum) en
        // yfirferðin sýndi hann hvergi, svo hann sá ekki það sem hann kvartaði yfir
        // fyrr en viðtakandinn fékk póstinn. Yfirferð á að sýna það sem fer út.
        '<div class="rpm-row"><label class="rpm-lbl">Sent frá</label><div>' + esc(payload.from) +
          (m && m.account && String(payload.from).indexOf(m.account) >= 0
            ? '<div class="meta">sama hólf og fékk fyrirspurnina</div>'
            : '<div class="meta">⚠ annað hólf en fékk fyrirspurnina (' + esc(m && m.account || 'óþekkt') + ')</div>') +
        '</div></div>' +
        '<div class="rpm-row"><label class="rpm-lbl">Efni</label><div>' + esc(payload.subject) + '</div></div>' +
        '<div class="rpm-row"><label class="rpm-lbl">Viðhengi (' + (payload.attachments || []).length + ')</label><ul style="margin:0;padding-left:18px">' + (vidh || '<li>engin</li>') + '</ul></div>' +
        '<div class="rpm-row"><label class="rpm-lbl">Skilaboð</label><div style="white-space:pre-wrap">' + esc(note || '(engin)') + '</div></div>' +
      '</div>' +
      '<div class="rpm-foot"><span class="rpm-msg" id="_rpm-msg"></span>' +
        '<button class="rpm-btn" type="button" id="_rpm-back">‹ Til baka</button>' +
        '<button class="rpm-btn prim" type="button" id="_rpm-go">📤 Senda núna</button></div>'
    );
    const card = modalEl();
    // Teiknaði reikningurinn: byggður úr base64-inu sem FER, svo forskoðunin sé
    // ekki „svipað skjal" heldur sama skjal. Blob-slóðin er losuð eftir opnun.
    card.querySelectorAll('button.rpm-opna[data-vidh]').forEach(b => b.addEventListener('click', () => {
      try {
        const a = (payload.attachments || [])[+b.dataset.vidh];
        if (!a || !a.content) return;
        const bin = atob(String(a.content).replace(/^data:[^,]*,/, ''));
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }));
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (_) { alert('Náði ekki að opna viðhengið.'); }
    }));
    card.querySelector('.rpm-x').onclick = closeModal;
    card.querySelector('#_rpm-back').onclick = () => openSendModal(m);
    card.querySelector('#_rpm-go').onclick = () => sendaNuna(m, payload);
  }
  /* Skrefið sem SENDIR. Aðskilið frá `undirbua` af ásettu ráði: sendingin sjálf
   * á að vera stutt og læsileg, því hún er það eina sem ekki verður tekið til
   * baka. Hér er ekkert byggt og engu breytt — aðeins sent og lesið svarið.
   */
  async function sendaNuna(m, payload) {
    const card = modalEl();
    const msg = card.querySelector('#_rpm-msg');
    const btn = card.querySelector('#_rpm-go');
    const setMsg = (x, c) => { msg.textContent = x; msg.className = 'rpm-msg ' + (c || ''); };
    btn.disabled = true;
    setMsg('Sendi…', '');
    try {
      // 2026-07-20: Gmail (AppMail → /api/gmail-send) í stað Resend.
      // 19.09.2026: hér stóð varaleið á /api/email-send. Sú leið er DAUÐ fyrir
      // eldklar.is (sjá 254:341) — hún hefði skilað svari sem lítur út eins og
      // sending og notandinn fengið „✓ Sent" um póst sem fór aldrei. Vanti
      // AppMail stoppar sendingin og segir af hverju.
      if (!(window.AppMail && AppMail.send)) throw new Error('Póstleiðin (AppMail) hefur ekki hlaðist — endurhlaðið síðuna. Ekkert var sent.');
      const r = await AppMail.send(payload);
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.message || e.error || ('HTTP ' + r.status));
      }
      // Þjónninn getur skilað 200 OG sagt frá viðhengi sem náðist ekki í
      // (sjá warnings í email-send.js). Það á að sjást — hálf sending er ekki
      // sending.
      let vidvorun = null;
      try {
        const j = await r.clone().json();
        if (j && Array.isArray(j.warnings) && j.warnings.length) vidvorun = j.warnings.join(' · ');
      } catch (_) {}
      const hve = (payload.attachments || []).length;
      if (vidvorun) {
        setMsg('Sent — EN viðhengi vantaði: ' + vidvorun, 'bad');
        if (window.Toast && Toast.show) Toast.show('Sent, en viðhengi vantaði: ' + vidvorun);
      } else {
        setMsg('✓ Sent á ' + payload.to.join(', ') + ' (' + hve + ' viðhengi)', 'ok');
        if (window.Toast && Toast.show) Toast.show('✓ Sent á ' + payload.to.join(', '));
      }
      logActivity(m.message_id, 'invoice');
      setTimeout(closeModal, vidvorun ? 3200 : 1200);
    } catch (e) {
      setMsg('Villa: ' + String((e && e.message) || e), 'bad');
      btn.disabled = false;
    }
  }

  // Send ONE specific invoice PDF straight to an address (used by the assistant's
  // „umbeðin skjöl" list). Confirms first; reuses the same PDF + email path.
  async function quickSendInvoice(m, sale, toEmail) {
    const to = (toEmail || (m && m.from) || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { alert('Ógilt netfang: ' + to); return false; }
    if (!window.UttektInvoicePdf || !UttektInvoicePdf.buildInvoiceBlob) { alert('PDF-teiknari ekki tiltækur'); return false; }
    if (!confirm('Senda ' + (sale.num || 'reikning') + ' (' + fmtKr(sale.samtals) + ') á ' + to + '?')) return false;
    try {
      const full = (await getFullSale(sale.id)) || sale;
      const co = await coForSale(full, m);
      const blob = await UttektInvoicePdf.buildInvoiceBlob(full, co);
      const b64 = await blobToB64(blob);
      const fname = [(co.nafn || 'reikningur').replace(/\s+/g, ' ').trim(), full.num || ''].filter(Boolean).join(' - ') + '.pdf';
      // 2026-07-20: Gmail (AppMail → /api/gmail-send) í stað Resend.
      const payload = {
        from: emailFrom(), to: [to],
        subject: 'Reikningur ' + (full.num || '') + ' frá Brunahólf Slökkvitæki ehf',
        html: buildEmailHtml(full, co, ''),
        attachments: [{ filename: fname, content: b64 }],
      };
      // 19.09.2026: hér stóð varaleið á /api/email-send. Sú leið er DAUÐ fyrir
      // eldklar.is (sjá 254:341) — hún hefði skilað svari sem lítur út eins og
      // sending og notandinn fengið „✓ Sent" um póst sem fór aldrei. Vanti
      // AppMail stoppar sendingin og segir af hverju.
      if (!(window.AppMail && AppMail.send)) throw new Error('Póstleiðin (AppMail) hefur ekki hlaðist — endurhlaðið síðuna. Ekkert var sent.');
      const r = await AppMail.send(payload);
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.message || e.error || ('HTTP ' + r.status));
      }
      if (window.Toast && Toast.show) Toast.show('✓ ' + (full.num || 'Reikningur') + ' sendur á ' + to);
      logActivity(m.message_id, 'invoice');
      return true;
    } catch (e) { alert('Villa: ' + String((e && e.message) || e)); return false; }
  }

  // „Find requested documents": list the customer's invoices, star the one the
  // email asks for (AI invoice_ref or an R-number in the text), one-tap send.
  async function renderRequestedDocs(m, requested) {
    const card = modalEl();
    const row = card.querySelector('#_rpm-docs-row');
    const box = card.querySelector('#_rpm-docs');
    if (!row || !box) return;
    const kt = m.cust && ktDigits(m.cust.kt);
    const kind = (requested && requested.kind) || 'ekkert';
    const hayRef = (((m.subject || '') + ' ' + (m.body_preview || m.snippet || '')).toUpperCase().match(/R-0\d{5}/) || [])[0] || null;
    const ref = (requested && requested.invoice_ref) || hayRef;
    if (!kt || (kind === 'ekkert' && !ref)) { row.style.display = 'none'; return; }
    row.style.display = '';
    box.innerHTML = '<div class="rpm-note" style="margin:0">Sæki reikninga…</div>';
    const invs = (await getCustomerInvoices(kt)).filter(s => s && s.num);
    if (!invs.length) { box.innerHTML = '<div class="rpm-note" style="margin:0">Engir reikningar fundust á þennan viðskiptavin.</div>'; return; }
    const norm = s => String(s || '').toUpperCase().replace(/\s/g, '');
    box.innerHTML = invs.slice(0, 8).map((s, i) => {
      const match = ref && norm(s.num) === norm(ref);
      return '<div class="rpm-doc' + (match ? ' match' : '') + '">' +
        '<span class="n">' + esc(s.num || '—') + (match ? ' ★' : '') + '</span>' +
        '<span class="meta">' + fmtKr(s.samtals) + ' · ' + esc(fmtDate(s.created_at)) + (s.paid_at ? ' · greitt' : '') + '</span>' +
        '<button class="rpm-doc-send" data-i="' + i + '" type="button">✉️ Senda</button></div>';
    }).join('');
    box.querySelectorAll('.rpm-doc-send').forEach(b => b.addEventListener('click', async () => {
      const s = invs[+b.dataset.i]; if (!s) return;
      b.disabled = true; const ok = await quickSendInvoice(m, s, m.from); b.disabled = false;
      if (ok) { b.textContent = '✓ Sent'; b.classList.add('sent'); }
    }));
  }

  // ── Tier 3: 🤖 Semja svar — AI-drafted reply (office reviews before sending) ─
  async function openReplyModal(m) {
    openModal(
      '<div class="rpm-head"><div><h3>🤖 Aðstoð — yfirlit, svar & skjöl</h3><div class="sub">' + esc(m.sender_name || m.from) + ' · ' + esc(m.from) + '</div></div><button class="rpm-x" type="button">✕</button></div>' +
      '<div class="rpm-body">' +
        '<div class="rpm-row"><label class="rpm-lbl">Upprunalegur póstur</label>' +
          '<div class="rpm-src"><b>' + esc(m.subject || '(ekkert efni)') + '</b><br>' + esc((m.body_preview || m.snippet || '').replace(/\s+/g, ' ').slice(0, 400)) + '</div></div>' +
        '<div class="rpm-row" id="_rpm-summary-row" style="display:none"><label class="rpm-lbl">📋 Yfirlit</label><div class="rpm-summary" id="_rpm-summary"></div></div>' +
        '<div class="rpm-row" id="_rpm-docs-row" style="display:none"><label class="rpm-lbl">📎 Umbeðin skjöl — smelltu til að senda</label><div class="rpm-docs" id="_rpm-docs"></div></div>' +
        '<div class="rpm-ai-tip" id="_rpm-tips">' +
          '<button type="button" data-t="Staðfestu að við sendum reikninginn sem viðhengi.">Sendi reikning</button>' +
          '<button type="button" data-t="Biddu um netfang eða kt til að finna réttan reikning.">Bið um uppl.</button>' +
          '<button type="button" data-t="Segðu að við lögum reikninginn og sendum leiðréttan.">Leiðrétti reikning</button>' +
          '<button type="button" data-t="Þakkaðu fyrir greiðsluna og staðfestu að hún sé móttekin.">Staðfesti greiðslu</button>' +
        '</div>' +
        '<div class="rpm-row"><label class="rpm-lbl">Efni</label><input id="_rpm-subj" type="text" value="Re: ' + esc(m.subject || '') + '"></div>' +
        '<div class="rpm-row"><label class="rpm-lbl">Svar (yfirfarðu áður en þú sendir)</label><textarea id="_rpm-reply" class="reply" placeholder="Smelltu á ✨ Semja svar…"></textarea></div>' +
      '</div>' +
      '<div class="rpm-foot"><span class="rpm-msg" id="_rpm-msg"></span>' +
        '<button class="rpm-btn ai" type="button" id="_rpm-gen">✨ Semja svar</button>' +
        '<span class="spacer"></span>' +
        '<button class="rpm-btn" type="button" id="_rpm-copy">📋 Afrita</button>' +
        '<button class="rpm-btn prim" type="button" id="_rpm-reply-send">📤 Senda svar</button></div>'
    );
    const card = modalEl();
    let instruction = '';
    card.querySelector('.rpm-x').onclick = closeModal;
    card.querySelectorAll('#_rpm-tips button').forEach(b => b.addEventListener('click', () => { instruction = b.dataset.t; genReply(m, () => instruction); }));
    card.querySelector('#_rpm-gen').onclick = () => genReply(m, () => instruction);
    card.querySelector('#_rpm-copy').onclick = () => {
      const ta = card.querySelector('#_rpm-reply');
      try { navigator.clipboard.writeText(ta.value); if (window.Toast && Toast.show) Toast.show('✓ Afritað'); } catch (_) { ta.select(); document.execCommand('copy'); }
    };
    card.querySelector('#_rpm-reply-send').onclick = () => sendReply(m);
    // Forvinna af Þjónustuborði: fylla svarið og yfirlitið, hoppa yfir Claude.
    // Ekkert sent hér — notandinn ýtir á Senda svar.
    if (m.draftBody) {
      const ta = card.querySelector('#_rpm-reply');
      if (ta) ta.value = m.draftBody;
      if (m.draftSummary) {
        const sumRow = card.querySelector('#_rpm-summary-row');
        const sumEl = card.querySelector('#_rpm-summary');
        if (sumRow) sumRow.style.display = '';
        if (sumEl) sumEl.textContent = m.draftSummary;
      }
      const msg = card.querySelector('#_rpm-msg');
      if (msg) { msg.textContent = 'Forvinna úr Þjónustuborði — yfirfarðu áður en þú sendir.'; msg.className = 'rpm-msg'; }
    } else {
      genReply(m, () => '');
    }
  }
  async function customerInvContext(m) {
    const kt = m.cust && ktDigits(m.cust.kt);
    if (!kt) return [];
    const rows = await getCustomerInvoices(kt);
    return rows.slice(0, 12).map(s => ({ num: s.num, date: fmtDate(s.created_at), samtals: s.samtals, paid: !!s.paid_at }));
  }
  async function genReply(m, getInstruction) {
    const card = modalEl();
    const ta = card.querySelector('#_rpm-reply');
    const subj = card.querySelector('#_rpm-subj');
    const msg = card.querySelector('#_rpm-msg');
    const gen = card.querySelector('#_rpm-gen');
    if (!ta) return;
    const setMsg = (t, cls) => { if (msg) { msg.textContent = t; msg.className = 'rpm-msg ' + (cls || ''); } };
    gen.disabled = true; setMsg('Claude semur svar…', '');
    try {
      const invoices = await customerInvContext(m);
      const r = await fetch('/api/postur-reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: { sender_name: m.sender_name, sender_email: m.from, subject: m.subject, body: m.body_preview || m.snippet || '' },
          customer: m.cust ? { name: m.cust.name, kt: ktDashed(m.cust.kt) } : null,
          invoices,
          instruction: (getInstruction && getInstruction()) || '',
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
      if (d.body) ta.value = d.body;
      if (d.subject && subj) subj.value = d.subject;
      // 📋 summary of what the sender wants
      const sumRow = card.querySelector('#_rpm-summary-row'), sumEl = card.querySelector('#_rpm-summary');
      if (sumEl && d.summary) { sumEl.textContent = d.summary; sumRow.style.display = ''; }
      // 📎 requested documents (invoices) — surface + one-tap send
      try { await renderRequestedDocs(m, d.requested); } catch (_) {}
      setMsg('✓ Uppkast tilbúið — yfirfarðu það', 'ok');
    } catch (e) {
      setMsg('Villa: ' + String((e && e.message) || e), 'bad');
    } finally { gen.disabled = false; }
  }
  function malFyrirLykil(k) {
    return (state._rows || []).filter(function (r) { return r.threadKey === k; })[0] || null;
  }
  function svarStada(k, msg, cls, bidur) {
    const s = state.svar[k]; if (!s) return;
    s.msg = msg || ''; s.cls = cls || ''; s.bidur = !!bidur; render();
  }

  // Uppkast fra Claude. /api/postur-reply skilar VILLU ef svarid er ekki
  // laesilegt — hrar texti fer aldrei i reitinn (sja postur-reply.js).
  async function semjaInline(m) {
    const k = m.threadKey; const s = state.svar[k]; if (!s) return;
    svarStada(k, 'Claude semur uppkast\u2026', '', true);
    try {
      const invoices = await customerInvContext(m);
      const r = await fetch('/api/postur-reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: { sender_name: m.sender_name, sender_email: m.from, subject: m.subject, body: m.body_preview || m.snippet || '' },
          customer: m.cust ? { name: m.cust.name, kt: ktDashed(m.cust.kt) } : null,
          invoices, instruction: '',
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
      const s2 = state.svar[k]; if (!s2) return;
      if (d.body) s2.texti = d.body;
      if (d.subject) s2.efni = d.subject;
      svarStada(k, d.summary ? ('\u2713 Uppkast tilb\u00fai\u00f0 \u00b7 ' + d.summary) : '\u2713 Uppkast tilb\u00fai\u00f0 \u2014 yfirfar\u00f0u \u00fea\u00f0', 'ok', false);
    } catch (e) {
      svarStada(k, 'Villa: ' + String((e && e.message) || e), 'bad', false);
    }
  }

  // Sending. Nakvaemlega sama leid og sendReply notar (AppMail -> gmail-send,
  // In-Reply-To -> sami thradur). Engin varaleid: se AppMail ekki hladid er
  // STOPPAD, thvi gamla /api/email-send leidin er daud fyrir eldklar.is og
  // hefdi skilad "sent" um post sem for aldrei.
  async function sendaInline(m) {
    const k = m.threadKey; const s = state.svar[k]; if (!s) return;
    const to = m.from, efni = String(s.efni || '').trim() || ('Re: ' + (m.subject || ''));
    const texti = String(s.texti || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to || '')) { svarStada(k, 'Sendandanetfang \u00f3gilt', 'bad', false); return; }
    if (!texti) { svarStada(k, 'Svari\u00f0 er t\u00f3mt', 'bad', false); return; }
    svarStada(k, 'Sendi\u2026', '', true);
    try {
      if (!(window.AppMail && AppMail.send)) throw new Error('P\u00f3stlei\u00f0in (AppMail) hefur ekki hla\u00f0ist \u2014 endurhla\u00f0i\u00f0 s\u00ed\u00f0una. Ekkert var sent.');
      const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a;white-space:pre-wrap;line-height:1.6">' + esc(texti) + '</div>';
      const r = await AppMail.send({ from: postholfFyrir(m), to: [to], subject: efni, html, inReplyTo: m.message_id || undefined });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || e.error || ('HTTP ' + r.status)); }
      let svar = {}; try { svar = (await r.json()) || {}; } catch (_) {}
      const thradur = svar.threaded === true ? ' \u00b7 \u00ed sama \u00fer\u00e6\u00f0i' : (m.message_id ? ' \u00b7 \u00fer\u00e1\u00f0urinn fannst ekki hj\u00e1 okkur' : '');
      logActivity(m.message_id, 'reply');
      try { state.activity.add(m.message_id); } catch (_) {}
      try { if (typeof m._onSent === 'function') m._onSent(); } catch (_) {}
      try { if (window.Toast && Toast.show) Toast.show('\u2713 Svar sent \u00e1 ' + to + thradur); } catch (_) {}
      delete state.svar[k];
      render();
    } catch (e) {
      svarStada(k, 'Villa: ' + String((e && e.message) || e), 'bad', false);
    }
  }

  async function sendReply(m) {
    const card = modalEl();
    const msg = card.querySelector('#_rpm-msg');
    const btn = card.querySelector('#_rpm-reply-send');
    const to = m.from;
    const subject = (card.querySelector('#_rpm-subj').value || '').trim() || ('Re: ' + (m.subject || ''));
    const bodyTxt = (card.querySelector('#_rpm-reply').value || '').trim();
    const setMsg = (t, cls) => { msg.textContent = t; msg.className = 'rpm-msg ' + (cls || ''); };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to || '')) { setMsg('Sendandanetfang ógilt', 'bad'); return; }
    if (!bodyTxt) { setMsg('Svarið er tómt', 'bad'); return; }
    btn.disabled = true; setMsg('Sendi…', '');
    const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a;white-space:pre-wrap;line-height:1.6">' + esc(bodyTxt) + '</div>';
    try {
      // 2026-07-20: Gmail (AppMail → /api/gmail-send) í stað Resend.
      // 10.09.2026 — Agnar: „svarað póstum úr kerfinu og það haldi sama samtalinu".
      // Message-ID upprunalega póstsins → gmail-send setur In-Reply-To/References og threadId.
      // 11.09.2026: svarið fer frá pósthólfinu sem TÓK VIÐ póstinum (bokhald@ eða eldklar@). Áður fór
      // hvert svar frá eldklar@, og þráðaleit gmail-send fann ekki póst sem kom inn á bokhald@.
      const postholf = String(m.account || '').trim();
      const payload = { from: /^(eldklar|bokhald)@eldklar\.is$/i.test(postholf) ? postholf : emailFrom(), to: [to], subject, html, inReplyTo: m.message_id || undefined };
      // 19.09.2026: hér stóð varaleið á /api/email-send. Sú leið er DAUÐ fyrir
      // eldklar.is (sjá 254:341) — hún hefði skilað svari sem lítur út eins og
      // sending og notandinn fengið „✓ Sent" um póst sem fór aldrei. Vanti
      // AppMail stoppar sendingin og segir af hverju.
      if (!(window.AppMail && AppMail.send)) throw new Error('Póstleiðin (AppMail) hefur ekki hlaðist — endurhlaðið síðuna. Ekkert var sent.');
      const r = await AppMail.send(payload);
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.message || e.error || ('HTTP ' + r.status));
      }
      // gmail-send segir hvort svarið lenti í sama þræði hjá okkur (threaded) — sýnt svo það sjáist.
      let svar = {};
      try { svar = (await r.json()) || {}; } catch (_) {}
      const thradur = svar.threaded === true ? ' · í sama þræði' : (m.message_id ? ' · þráðurinn fannst ekki hjá okkur' : '');
      setMsg('✓ Svar sent á ' + to + thradur, 'ok');
      if (window.Toast && Toast.show) Toast.show('✓ Svar sent á ' + to + thradur);
      logActivity(m.message_id, 'reply');
      // Þjónustuborð v2: borðið (231) hengir _onSent á m-hlutinn í replyTo —
      // látum það vita svo beiðnin fái svarad_at og „✓ svarað"-merkið strax.
      try { if (typeof m._onSent === 'function') m._onSent(); } catch (_) {}
      setTimeout(closeModal, 1100);
    } catch (e) { setMsg('Villa: ' + String((e && e.message) || e), 'bad'); btn.disabled = false; }
  }

  // ── wiring (mirrors patch 239) ──────────────────────────────────────────
  const NAV_LABEL = '📧 Reikninga-póstur';
  function ensureSidebarButton() {
    const existing = document.querySelector('[data-view="' + NAV_KEY + '"]');
    if (existing) {
      // A sidebar rebuild (patch 68/180/244) can revert the label to the clone
      // source's text — re-assert it every tick so it never reads "Kröfu yfirlit".
      if ((existing.textContent || '').indexOf('Reikninga-póstur') === -1) existing.textContent = NAV_LABEL;
      return true;
    }
    // Clone a SIMPLE text-label button (Hreyfingarlisti/Bakendi) — NOT Kröfu
    // yfirlit (patch 166), whose icon-span + text-node + badge markup made the
    // old piecemeal relabel leave a stray "Kröfu yfirlit" text → a duplicate nav.
    const sib = document.querySelector('[data-view="hreyfingarlisti"]')
      || document.querySelector('[data-view="bakendi"]')
      || document.querySelector('[data-view="krofu-yfirlit"]')
      || document.querySelector('[data-view]');
    if (!sib) return false;
    const btn = sib.cloneNode(true);
    btn.dataset.view = NAV_KEY;
    // Rebuild the label from scratch: one clean text node, no leftover markup.
    btn.textContent = NAV_LABEL;
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); });
    sib.parentNode.insertBefore(btn, sib.nextSibling);
    return true;
  }
  function hookSwitch() {
    if (!window.App || !App.switchView) return false;
    if (App.__rpPatched) return true;
    const orig = App.switchView.bind(App);
    App.switchView = function (k) {
      if (k === NAV_KEY) {
        document.querySelectorAll('.view').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
        const v = viewEl();
        v.style.display = 'block'; v.classList.add('active');
        render();
        if (!state.loaded && !state.loading) load();
        try { history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
        return;
      }
      const me = document.getElementById(VIEW_ID);
      if (me) { me.style.display = 'none'; me.classList.remove('active'); }
      return orig(k);
    };
    App.__rpPatched = true;
    return true;
  }
  function init() {
    viewEl();
    let sw = hookSwitch(), sb = ensureSidebarButton();
    [200, 600, 1500, 3500, 7000].forEach(ms => setTimeout(() => {
      if (!sw) sw = hookSwitch();
      if (!sb) sb = ensureSidebarButton();
    }, ms));
    const slug = (location.hash || '').replace(/^#/, '');
    if (slug === NAV_KEY || slug === 'postur') setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); }, 250);
    window.addEventListener('hashchange', () => {
      const s = (location.hash || '').replace(/^#/, '');
      if (s === NAV_KEY || s === 'postur') { if (window.App && App.switchView) App.switchView(NAV_KEY); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.ReikningaPostur = {
    open: () => { if (window.App && App.switchView) App.switchView(NAV_KEY); },
    reload: load,
    // 19.09.2026: sendi-glugginn fluttur út svo Þjónustuborðið geti kallað í hann
    // í stað þess að afrita hann. `m` þarf { cust } og/eða { sale }; án hvorugs
    // hefur hann enga reikninga til að bjóða.
    sendaReikning: (m) => openSendModal(m),
    // 2026-07-10 (ósk Agnars — svara af Verkborðinu): opna svar-modalinn fyrir
    // hvaða póst sem er, hvaðan sem er í appinu. `m` = { sender_name, from
    // (sendandanetfang), subject, body_preview|snippet, message_id, cust? }.
    // Sjálf-innihaldið: sprautar sína eigin stíla + festir modalinn á <body>.
    replyTo: async (m) => {
      try { styles(); } catch (_) {}
      if (!m || !m.from) { if (window.Toast && Toast.show) Toast.show('Ekkert sendandanetfang á þessum pósti'); return; }
      // Reyna að tengja sendanda-netfangið við kúnna (einkvæmt netfang → reikninga-
      // samhengi í uppkastinu). Valfrjálst — genReply höndlar m.cust=null.
      if (!m.cust) {
        try {
          const SB = getSB();
          if (SB && m.from) {
            const { data } = await SB.from('fyrirtaeki').select('id,nafn,kennitala').eq('netfang', m.from).limit(1);
            if (data && data.length) m.cust = { coId: data[0].id, name: data[0].nafn, kt: ktDigits(data[0].kennitala) };
          }
        } catch (_) {}
      }
      openReplyModal(m);
    },
  };
  console.log('[patch-240] Reikninga-póstur installed');
})();
/* === END REIKNINGA-PÓSTUR === */
