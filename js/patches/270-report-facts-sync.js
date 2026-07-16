/* === REPORT FACTS SYNC v1 (2026-07-16) ===
 *
 * Kerfislæg lagfæring (samþykkt af Agnari): þegar úttektarskýrsla er búin til
 * í appinu (patch 168 — líka flæðið á eftir „✓ Klára heimsókn", patch 165, sem
 * býr skýrsluna til gegnum 168) flæða tækjatölurnar BEINT inn í kerfið.
 * Áður var app-gerða skýrslan aðeins vistuð sem Supabase-bucket viðhengi og
 * facts-pípan las bara Drive-PDF — prófílar/listar héldu gömlum tölum
 * (Grillvagninn: 7 tæki í kerfinu, 21 í ferskri skýrslu).
 *
 * window.ReportFactsSync.sync(coId, counts, dateInfo) gerir, best-effort
 * (villa má ALDREI stöðva vistun skýrslunnar — ALLTAF LEYFA VISTUN):
 *   1. Upsert `arsskodun_report_facts` (PK fyrirtaeki_id) með 9-bucket
 *      equipment jsonb — aldrei niðurfærsla (nýtt report_year >= núverandi).
 *   2. Samræmir `uttaeki` við skýrslutölurnar (INSERT vantar sem AER-raðir,
 *      DELETE aðeins AER-umframraðir sem eru ekki 'loaned'/í verkstæðisferli).
 *   3. Uppfærir arsskodun_customers blobbið (last_year_inspected +
 *      inspect_month) gegnum AppSettings deep-merge — handvirkar yfirskriftir
 *      (inspect_month_manual / equipment_manual) vinna áfram.
 *   4. Skráir eina röð í override_log (field 'report_sync') svo rekjanlegt sé.
 *
 * computePlan() er HREINT fall (engin DB) svo hægt sé að einingaprófa
 * samræmingar-planið í node: (núverandi raðir + skýrslutölur) → {inserts, deleteIds}.
 */
(() => {
  if (window.__reportFactsSyncInstalled) return;
  window.__reportFactsSyncInstalled = true;

  const STORAGE_KEY = 'arsskodun_customers';

  // 9-bucket orðaforðinn (sami og patch 153 eq-ritillinn + arsskodun_report_facts).
  const BUCKETS = ['lettvatn', 'duft2', 'duft6_12', 'co2_2', 'co2_5',
                   'brunaslongur', 'reykskynjarar', 'eldvarnarteppi', 'annad'];

  // Patch 168 notar sína eigin lykla — varpað yfir í buckets.
  const KEY_168 = {
    lettvatn: 'lettvatn', duft_small: 'duft2', duft_big: 'duft6_12',
    co2_small: 'co2_2', co2_big: 'co2_5', slang: 'brunaslongur',
    reyk: 'reykskynjarar', teppi: 'eldvarnarteppi'
  };

  // Bucket → (type, size) fyrir NÝJAR uttaeki-raðir. annad er ALDREI snert.
  const BUCKET_ROW = {
    lettvatn:       { type: 'Léttvatn',       size: '6 L' },
    duft6_12:       { type: 'ABC Duft',       size: '6 kg' },
    duft2:          { type: 'ABC Duft',       size: '2 kg' },
    co2_5:          { type: 'CO2',            size: '5 kg' },
    co2_2:          { type: 'CO2',            size: '2 kg' },
    brunaslongur:   { type: 'Brunaslanga',    size: null },
    reykskynjarar:  { type: 'Reykskynjari',   size: null },
    eldvarnarteppi: { type: 'Eldvarnarteppi', size: null }
  };
  const RECON_BUCKETS = Object.keys(BUCKET_ROW); // 8 — annad utan samræmingar

  // Normalisera counts: tekur bæði 168-lykla og bucket-lykla; 'x'/null/'' → 0.
  function normalizeCounts(counts) {
    const out = {};
    BUCKETS.forEach(b => { out[b] = 0; });
    Object.keys(counts || {}).forEach(k => {
      const b = KEY_168[k] || (BUCKETS.indexOf(k) >= 0 ? k : null);
      if (!b) return;
      const raw = counts[k];
      const n = (raw === 'x' || raw == null || raw === '') ? 0 : parseInt(raw, 10);
      out[b] += (isNaN(n) || n < 0) ? 0 : n;
    });
    return out;
  }

  // Sama flokkun og 153/168 (categoryOf/categorize) — röð skiptir máli
  // (Eldvarnarteppi ber 'eldvarn' svo teppi er prófað á undan almennu eldvarn).
  function bucketOf(u) {
    const t = String((u && u.type) || '').toLowerCase();
    const s = String((u && u.size) || '').toLowerCase();
    const sizeNum = parseFloat(s.replace(',', '.')) || 0;
    if (/léttv|lettv|abf|froð|frod/.test(t)) return 'lettvatn';
    if (/\bduft\b|\babc\b|\bpfc\b/.test(t)) return sizeNum <= 3 ? 'duft2' : 'duft6_12';
    if (/co2|co₂|co_?2|kolsyr|kolsýr/.test(t)) return sizeNum <= 3 ? 'co2_2' : 'co2_5';
    // Slönguskápur telst með brunaslöngum (spec 2026-07-16).
    if (/brunaslang|brunaslöng|brunaslong|slang|slöng|hose/.test(t)) return 'brunaslongur';
    if (/reykskynj|smoke/.test(t)) return 'reykskynjarar';
    if (/teppi|blanket|eldvarn/.test(t)) return 'eldvarnarteppi';
    return 'annad';
  }

  // Sömu „ekki-í-notkun" stöður og 168 fetchUnits — þær teljast ekki með.
  function normStatus(st) {
    const c = String(st == null ? '' : st).toLowerCase();
    if (c === 'onytt' || c === 'ónýtt') return 'onytt';
    if (/geymsl/.test(c)) return 'geymsla';
    if (c === 'urelt' || c === 'úrelt') return 'urelt';
    if (/vinnsl/.test(c)) return 'i_vinnslu';
    return c || 'active';
  }
  const NONBILL = { onytt: 1, geymsla: 1, urelt: 1, i_vinnslu: 1 };

  function serialFor(dateIso, coId, bucket, n) {
    const d = String(dateIso || '').replace(/-/g, '').slice(2, 8) || '000000';
    return 'AER' + d + '-' + coId + '-' + bucket + '-' + n;
  }

  // ── HREINT samræmingar-plan (einingaprófanlegt) ──────────────────────────
  // rows: núverandi uttaeki-raðir félagsins ({id,serial,type,size,status,custody_status})
  // bucketCounts: normaliseraðar skýrslutölur. opts: {coId, client, dateIso, nextIso, year}
  // → { inserts:[uttaeki-röð...], deleteIds:[id...], detail:{bucket:{have,want,add,del}} }
  function computePlan(rows, bucketCounts, opts) {
    const o = opts || {};
    const byBucket = {};
    RECON_BUCKETS.forEach(b => { byBucket[b] = []; });
    (rows || []).forEach(u => {
      if (NONBILL[normStatus(u.status)]) return;
      const b = bucketOf(u);
      if (byBucket[b]) byBucket[b].push(u); // annad → hunsað
    });
    const inserts = [], deleteIds = [], detail = {};
    RECON_BUCKETS.forEach(b => {
      const have = byBucket[b].length;
      const want = Math.max(0, +bucketCounts[b] || 0);
      let add = 0, del = 0;
      if (want > have) {
        add = want - have;
        const spec = BUCKET_ROW[b];
        for (let i = 1; i <= add; i++) {
          inserts.push({
            serial: serialFor(o.dateIso, o.coId, b, have + i),
            type: spec.type, size: spec.size,
            client: o.client, location: '',
            status: 'active',
            last_insp: o.dateIso, next_insp: o.nextIso,
            notes: 'Auto: samræmt við úttektarskýrslu ' + (o.year || '')
          });
        }
      } else if (have > want) {
        // Eyðum AÐEINS AER-sjálfgerðum umframröðum sem eru ekki á verkstæði
        // (status 'loaned' / custody_status sett) — og aldrei niður fyrir want.
        const candidates = byBucket[b].filter(u =>
          /^AER/.test(String(u.serial || '')) &&
          normStatus(u.status) !== 'loaned' &&
          u.custody_status == null);
        del = Math.min(have - want, candidates.length);
        for (let i = 0; i < del; i++) deleteIds.push(candidates[i].id);
      }
      detail[b] = { have, want, add, del };
    });
    return { inserts, deleteIds, detail };
  }

  function isoPlus1y(iso) {
    const d = new Date(iso);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  // ── Aðal-inngangur: kallað úr patch 168 eftir að skýrsla er vistuð ───────
  // counts = ctx.counts úr 168 (168-lyklar) eða bucket-lyklar.
  // dateInfo = { year, month(1-12) }.
  async function sync(coId, counts, dateInfo) {
    const summary = { facts: false, inserts: 0, deletes: 0, blob: false, skipped: null };
    try {
      const sb = window.DB && window.DB.sb;
      if (!sb || !coId) return summary;
      const now = new Date();
      const year = Math.max(2000, +(dateInfo && dateInfo.year) || now.getFullYear());
      let month = +(dateInfo && dateInfo.month) || (now.getMonth() + 1);
      if (month < 1 || month > 12) month = now.getMonth() + 1;
      // Skýrsludagur: í dag ef yfirstandandi mánuður, annars 1. dags mánaðarins.
      const cm = (now.getFullYear() === year && (now.getMonth() + 1) === month);
      const dateIso = cm ? now.toISOString().slice(0, 10)
        : year + '-' + String(month).padStart(2, '0') + '-01';
      const eq = normalizeCounts(counts);

      // 1. arsskodun_report_facts — les fyrst, aldrei niðurfærsla.
      let existingFacts = null;
      try {
        const r = await sb.from('arsskodun_report_facts')
          .select('fyrirtaeki_id,report_year,inspect_month,equipment,total_devices')
          .eq('fyrirtaeki_id', coId).maybeSingle();
        existingFacts = r && r.data ? r.data : null;
      } catch (_) {}
      if (existingFacts && +existingFacts.report_year > year) {
        // Eldri skýrsla en það sem þegar er skráð — snertum EKKERT.
        summary.skipped = 'older_report';
        return summary;
      }
      // annad kemur ekki úr 168-skýrslunni — höldum fyrra facts-gildi.
      if (existingFacts && existingFacts.equipment && +existingFacts.equipment.annad > 0 && !eq.annad) {
        eq.annad = +existingFacts.equipment.annad;
      }
      const total = BUCKETS.reduce((s, b) => s + (+eq[b] || 0), 0);
      try {
        const up = await sb.from('arsskodun_report_facts').upsert({
          fyrirtaeki_id: coId,
          report_year: year,
          inspect_month: month,
          total_devices: total,
          parse_ok: true,
          equipment: eq
        }, { onConflict: 'fyrirtaeki_id' });
        summary.facts = !(up && up.error);
      } catch (_) {}

      // 2. Samræma uttaeki (client = fyrirtaeki.nafn, nákvæmt).
      let oldTotal = null;
      try {
        const c = await sb.from('fyrirtaeki').select('id,nafn').eq('id', coId).maybeSingle();
        const nafn = c && c.data && c.data.nafn;
        if (nafn) {
          let rows = [];
          let from = 0; const page = 1000;
          while (true) {
            const r = await sb.from('uttaeki')
              .select('id,serial,type,size,status,custody_status')
              .eq('client', nafn).range(from, from + page - 1);
            if (r.error || !r.data) break;
            rows = rows.concat(r.data);
            if (r.data.length < page) break;
            from += page;
          }
          oldTotal = rows.filter(u => !NONBILL[normStatus(u.status)]).length;
          const plan = computePlan(rows, eq, {
            coId, client: nafn, dateIso, nextIso: isoPlus1y(dateIso), year
          });
          if (plan.inserts.length) {
            const ins = await sb.from('uttaeki').insert(plan.inserts);
            if (!ins.error) summary.inserts = plan.inserts.length;
          }
          if (plan.deleteIds.length) {
            const del = await sb.from('uttaeki').delete().in('id', plan.deleteIds);
            if (!del.error) summary.deletes = plan.deleteIds.length;
          }
        }
        // 4. override_log — ein rekjanleikaröð (best-effort).
        try {
          await sb.from('override_log').insert({
            co_id: coId,
            co_nafn: (c && c.data && c.data.nafn) || null,
            field: 'report_sync',
            old_value: oldTotal == null ? null : String(oldTotal),
            new_value: String(total),
            page: 'uttekt'
          });
        } catch (_) {}
      } catch (_) {}

      // 3. arsskodun_customers blob — deep-merge (sama race-örugga mynstur og
      //    153 ⚡-ritlarnir). Handvirkar yfirskriftir vinna áfram.
      try {
        if (window.AppSettings && AppSettings.save) {
          const arsMap = (AppSettings.path && AppSettings.path(STORAGE_KEY)) || {};
          const rec = arsMap[String(coId)] || {};
          const patch = {};
          const curYr = +rec.last_year_inspected || 0;
          if (year >= curYr) patch.last_year_inspected = year;
          // inspect_month_manual = handvirk yfirskrift notanda — vinnur alltaf.
          // (equipment_manual varðar tækjatölur í blobbi, sem hér er ekki skrifað í.)
          if (!rec.inspect_month_manual) patch.inspect_month = month;
          if (Object.keys(patch).length) {
            const ok = await AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: patch } });
            summary.blob = !!ok;
          }
        }
      } catch (_) {}

      try {
        if (window.CustomerBrief && CustomerBrief.invalidate) CustomerBrief.invalidate(coId);
      } catch (_) {}
      console.log('[report-facts-sync]', coId, summary);
      return summary;
    } catch (e) {
      // Má ALDREI stöðva vistun skýrslunnar.
      console.warn('[report-facts-sync] villa (hunsað):', e && e.message || e);
      return summary;
    }
  }

  window.ReportFactsSync = { sync, computePlan, normalizeCounts, bucketOf,
    _BUCKET_ROW: BUCKET_ROW, _BUCKETS: BUCKETS };
  console.log('[patch-270] Report facts sync installed');
})();
/* === END REPORT FACTS SYNC v1 === */
