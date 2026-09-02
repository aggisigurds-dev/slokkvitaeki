/**
 * TRÍÓ-MÆLITÆKIÐ — ein skilgreining, tvær hurðir.
 *
 * Agnar 2026-09-01: „Þá setur maður frekar trigger í mælaborð eða álíka til að
 * renna check gegnum kerfið."
 *
 *   GET /api/trio            mælir og skilar tölum. SKRIFAR EKKERT.
 *   GET /api/trio?skra=1     mælir OG skráir breytingar í trio_saga + alarm.
 *   GET /api/trio?fid=443    eitt fyrirtæki í smáatriðum.
 *
 * ── AF HVERJU HÉR OG EKKI Í MÆLABORÐINU ───────────────────────────────────
 * Rökfræðin bjó fyrst í tools/trio.cjs. Að afrita hana inn í mælaborðið hefði
 * gefið TVÆR skilgreiningar á sömu tölu — nákvæmlega villan sem kostaði mest
 * 31.08–01.09: Veiðin sagði 149 og önnur skrá sagði 46 um sama hlut, og hvorug
 * vissi af hinni. Þess vegna er hún hér, á einum stað, og bæði mælaborðið og
 * tools/trio.cjs kalla í hana.
 *
 * ── HEIMILDIRNAR ÞRJÁR ────────────────────────────────────────────────────
 *   PRÓFÍLL     `uttaeki`-raðir á fyrirtaeki_id — spjaldið og kostnaðurinn
 *   SKÝRSLA     `arsskodun_report_facts.total_devices` — tæknimaður á staðnum
 *   REIKNINGUR  tækjalínur síðustu sölu — afgreiðsla
 *
 * Þær eru skrifaðar af ÓLÍKUM aðilum á ólíkum tíma. Samhljóðun er því sönnun,
 * ekki tilviljun. Víki ein veit maður hver.
 *
 * PRÓFÍLL vs SKÝRSLA er sterkari mælirinn og á fjórfalt fleiri fyrirtæki (501 á móti 132). Reikningur nær aðeins yfir það sem var þjónustað þann daginn,
 * svo hann víkur oft af fullkomlega eðlilegum ástæðum.
 */
import fs from 'node:fs';
import path from 'node:path';

function config() {
  const src = fs.readFileSync(path.join(process.cwd(), 'js', 'config.js'), 'utf8');
  const url = (src.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
  const key = (src.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
  if (!url || !key) throw new Error('Fann ekki SUPABASE_URL/KEY í js/config.js');
  return { url, key };
}

async function sb(cfg, q, init) {
  const r = await fetch(`${cfg.url}/rest/v1/${q}`, {
    ...init,
    headers: {
      apikey: cfg.key, Authorization: `Bearer ${cfg.key}`,
      'content-type': 'application/json', ...(init && init.headers),
    },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}

async function allar(cfg, q) {
  let out = [], from = 0;
  for (;;) {
    const d = await sb(cfg, `${q}&offset=${from}&limit=1000`);
    if (!Array.isArray(d) || !d.length) break;
    out = out.concat(d);
    if (d.length < 1000) break;
    from += 1000;
  }
  return out;
}

/* Tækjalína eða gjaldlína? Ræðst af því hvort lýsingin nefnir TEGUND. Vinna,
   Akstur, Skýrslugerð og fylgihlutir nefna enga tegund og detta út af sjálfu
   sér — enginn svartlisti sem gleymist að uppfæra. O-hringur er þó útilokaður
   sérstaklega: hann fylgir hverri hleðslu og hefði annars talist tæki. */
function taekiAfLinu(desc) {
  const t = String(desc || '').toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
    .replace(/[óò]/g, 'o').replace(/[úù]/g, 'u').replace(/ý/g, 'y')
    .replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ð/g, 'd').replace(/ö/g, 'o');
  if (/o-?hring|udastut|limmid|skilti|rafhlod|sjukra/.test(t)) return null;
  if (/lettv|abf|frod/.test(t)) return 'lettvatn';
  if (/duft|abc|pfc/.test(t)) return 'duft';
  if (/co2|co₂|kolsyr/.test(t)) return 'co2';
  if (/brunaslang|slongu/.test(t)) return 'brunaslongur';
  if (/reykskynj/.test(t)) return 'reykskynjarar';
  if (/teppi|eldvarn/.test(t)) return 'eldvarnarteppi';
  return null;
}

function linurAf(s) {
  let L = s.linur;
  if (typeof L === 'string') { try { L = JSON.parse(L); } catch (_) { L = []; } }
  return Array.isArray(L) ? L : [];
}

async function maela(cfg) {
  const [co, ut, facts, sol] = await Promise.all([
    allar(cfg, 'fyrirtaeki?select=id,nafn,er_i_thjonustu&deleted_at=is.null&order=id'),
    /* Í NOTKUN = allt NEMA 'urelt'. Ekki .eq('status','active').
       Mælt 01.09.2026: status ber FJÖGUR gildi — active 4891, urelt 482,
       'Í lagi' 154, 'ok' 74. Sían á 'active' faldi 228 tæki á 17 fyrirtækjum,
       og FJÓRTÁN þeirra eiga ekkert 'active' — þau litu út fyrir að vera
       alveg tóm. Bríetartún (48), Dalbrekka (48) og bílskúrinn (16) eru þar á
       meðal. Patch 129 ber athugasemd um sömu villu: „server-side
       .eq('status','active'), which silently dropped any unit." */
    allar(cfg, 'uttaeki?select=id,fyrirtaeki_id&status=neq.urelt&order=id'),
    allar(cfg, 'arsskodun_report_facts?select=fyrirtaeki_id,report_year,total_devices,parse_ok&order=fyrirtaeki_id'),
    allar(cfg, 'solur?select=customer_id,created_at,linur,is_credit,status&order=created_at.desc'),
  ]);

  const profill = new Map();
  ut.forEach(u => { if (u.fyrirtaeki_id == null) return; const k = String(u.fyrirtaeki_id); profill.set(k, (profill.get(k) || 0) + 1); });

  const skyrsla = new Map();
  facts.forEach(f => { if (f.total_devices != null) skyrsla.set(String(f.fyrirtaeki_id), { n: +f.total_devices, ar: f.report_year }); });

  const reikn = new Map();
  sol.forEach(s => {
    if (s.is_credit || s.status === 'void' || s.status === 'drog') return;
    const k = String(s.customer_id);
    if (reikn.has(k)) return;                    // listinn er nýjast-fyrst
    let n = 0, aTaeki = false;
    linurAf(s).forEach(l => { if (taekiAfLinu(l.desc)) { n += (+l.qty || 0); aTaeki = true; } });
    if (aTaeki) reikn.set(k, { n, dags: String(s.created_at).slice(0, 10) });
  });

  return { co, profill, skyrsla, reikn };
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });

  let cfg;
  try { cfg = config(); } catch (e) { return json(500, { villa: String(e.message) }); }

  try {
    const url = new URL(req.url);
    const fid = url.searchParams.get('fid');
    const skra = url.searchParams.get('skra') === '1';

    const { co, profill, skyrsla, reikn } = await maela(cfg);
    const nafn = new Map(co.map(c => [c.id, c.nafn]));

    if (fid) {
      const k = String(+fid);
      const sk = skyrsla.get(k), re = reikn.get(k);
      const saga = await sb(cfg, `trio_saga?select=*&fyrirtaeki_id=eq.${+fid}&order=dags.desc&limit=30`);
      return json(200, {
        fyrirtaeki_id: +fid, nafn: nafn.get(+fid) || null,
        profill: profill.get(k) ?? null,
        skyrsla: sk ? sk.n : null, skyrslu_ar: sk ? sk.ar : null,
        reikningur: re ? re.n : null, reiknings_dags: re ? re.dags : null,
        stemmir: (profill.has(k) && sk) ? (profill.get(k) === sk.n) : null,
        saga,
      });
    }

    const iThj = co.filter(c => c.er_i_thjonustu);
    let allar3 = 0, stemmirAllar = 0;
    let ps = 0, psStemmir = 0;
    const psVikur = [];

    iThj.forEach(c => {
      const k = String(c.id);
      const p = profill.get(k) ?? null;
      const s = skyrsla.has(k) ? skyrsla.get(k).n : null;
      const r = reikn.has(k) ? reikn.get(k).n : null;
      if (p > 0 && s > 0 && r > 0) { allar3++; if (p === s && s === r) stemmirAllar++; }
      if (p > 0 && s > 0) {
        ps++;
        if (p === s) psStemmir++;
        else psVikur.push({ id: c.id, nafn: c.nafn, profill: p, skyrsla: s, munur: Math.abs(p - s) });
      }
    });

    const svar = {
      maelt: new Date().toISOString(),
      i_thjonustu: iThj.length,
      allar_thrjar: allar3,
      allar_thrjar_sammala: stemmirAllar,
      profill_vs_skyrsla: ps,
      profill_vs_skyrsla_sammala: psStemmir,
      vikja: psVikur.length,
      vikja_5_eda_meira: psVikur.filter(v => v.munur >= 5).length,
      listi: psVikur.sort((a, b) => b.munur - a.munur),
      skrad: false,
      alarm: [],
    };

    if (skra) {
      /* Ein röð per BREYTINGU, ekki per keyrslu. Keyrsla sem finnur ekkert
         skrifar ekkert — annars drukknaði sagan í eins röðum. */
      const sag = await allar(cfg, 'trio_saga?select=*&order=dags.desc');
      const sidustu = new Map();
      sag.forEach(x => { const k = String(x.fyrirtaeki_id); if (!sidustu.has(k)) sidustu.set(k, x); });

      const nyjar = [];
      iThj.forEach(c => {
        const k = String(c.id);
        const p = profill.get(k) ?? null;
        const s = skyrsla.has(k) ? skyrsla.get(k).n : null;
        const r = reikn.has(k) ? reikn.get(k).n : null;
        if (p == null && s == null && r == null) return;
        const f = sidustu.get(k);
        const stemmirNu = (p != null && s != null) ? (p === s) : null;

        if (!f) {
          // ÖLL raða-form í sama bulk-insert VERÐA að hafa sömu lykla, annars
          // hafnar PostgREST öllu kallinu (PGRST102 „All object keys must match").
          // 'nytt' fékk ekki fyrri_*-lyklana sem 'breyting' hefur → keyrslan féll
          // um leið og hún fann bæði nýtt fyrirtæki OG breytingu. Pöddum með null.
          nyjar.push({ fyrirtaeki_id: c.id, profill: p, skyrsla: s, reikningur: r,
            stemmir: stemmirNu,
            fyrri_profill: null, fyrri_skyrsla: null, fyrri_reikningur: null, fyrri_dags: null,
            tegund: 'nytt',
            vidvorun: `Fyrsta mæling: prófíll ${p ?? '—'} · skýrsla ${s ?? '—'} · reikningur ${r ?? '—'}` });
          return;
        }
        if (f.profill === p && f.skyrsla === s && f.reikningur === r) return;

        const breyt = [];
        if (f.profill !== p) breyt.push(`prófíll ${f.profill ?? '—'} → ${p ?? '—'}`);
        if (f.skyrsla !== s) breyt.push(`skýrsla ${f.skyrsla ?? '—'} → ${s ?? '—'}`);
        if (f.reikningur !== r) breyt.push(`reikningur ${f.reikningur ?? '—'} → ${r ?? '—'}`);

        let teg = 'breyting';
        if (f.stemmir === true && stemmirNu === false) teg = 'rofnadi';
        else if (f.stemmir === false && stemmirNu === true) teg = 'lagadist';

        nyjar.push({ fyrirtaeki_id: c.id, profill: p, skyrsla: s, reikningur: r, stemmir: stemmirNu,
          fyrri_profill: f.profill, fyrri_skyrsla: f.skyrsla, fyrri_reikningur: f.reikningur,
          fyrri_dags: f.dags, tegund: teg, vidvorun: breyt.join(' · ') });
      });

      for (let i = 0; i < nyjar.length; i += 100) {
        await sb(cfg, 'trio_saga', { method: 'POST', body: JSON.stringify(nyjar.slice(i, i + 100)) });
      }
      svar.skrad = nyjar.length;
      svar.eftir_tegund = nyjar.reduce((m, x) => { m[x.tegund] = (m[x.tegund] || 0) + 1; return m; }, {});
      /* ALARMIÐ: staður sem VAR sammála og er það ekki lengur. Það er eina
         breytingin sem þýðir alltaf að eitthvað fór úrskeiðis — hinar geta
         verið eðlileg vinna (ný tæki skráð, ný skýrsla lesin). */
      svar.alarm = nyjar.filter(x => x.tegund === 'rofnadi')
        .map(x => ({ id: x.fyrirtaeki_id, nafn: nafn.get(x.fyrirtaeki_id) || null, hvad: x.vidvorun }));
    }

    return json(200, svar);
  } catch (e) {
    // Villa skilar ALDREI tómum tölum — tómt liti út eins og „ekkert misræmi".
    return json(500, { villa: String(e.message || e).slice(0, 400) });
  }
};

function cors() {
  return { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' };
}
function json(code, body) {
  return new Response(JSON.stringify(body, null, 1), {
    status: code, headers: { 'content-type': 'application/json; charset=utf-8', ...cors() },
  });
}
