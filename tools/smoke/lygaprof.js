/**
 * LYGAPRÓF — prófar hvort takkar segi satt þegar skrifin mistakast.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Agnar 17.09.2026: „takkinn gerir ekki það sem hann segist gera. Þetta hefur
 * verid gegnumgangandi rugl fra upphafi" — og „Held þurfi bara ad fara yfir
 * allann kóðan i algjöra yfirhalningu og test."
 *
 * HVERS VEGNA ÞETTA ER TIL
 * Handlestur á 380 skrám finnur færra en vél. Það var mælt sama dag: þröng leit
 * að ljúgandi tökkum skilaði 0, breið leit fann 24, og einn vörður fann 55 tilvik
 * af sömu rót. Þessi skrift snýr dæminu við — í stað þess að LESA kóðann
 * KEYRIR hún hann og horfir á hvað notandinn sér.
 *
 * AÐFERÐIN
 *   1. Öll skrifleið er stúfuð þannig að hún MISTEKST:
 *        · supabase .update/.insert/.upsert/.delete → { error }
 *        · storage .upload/.remove                  → { error }
 *        · AppSettings.save                         → false
 *        · fetch með aðferð annarri en GET          → 500
 *      Stúfað er á sjálfum biðlarahlutnum (`client.from`), ekki á `DB.sb`, því
 *      pappar geyma tilvísun í SAMA hlut í lokun — að skipta um `DB.sb` næði
 *      aðeins til þeirra sem sækja hann í hvert sinn.
 *   2. Allt sem sagt er við notandann er tekið upp: Toast.show, alert, confirm.
 *   3. Smellt er á alvöru takka í alvöru viðmóti.
 *   4. FELLUR ef eitthvað sem sést fullyrðir árangur þótt ekkert hafi vistast.
 *
 * ENGIN GÖGN ERU SNERT. Hvert einasta skrif er stöðvað áður en það fer af stað,
 * og talning í lokin sýnir hve mörgum var afstýrt. Sé sú tala 0 þegar smellt var
 * á vistunartakka er prófið sjálft bilað — það er líka sagt.
 *
 * NOTKUN (í vafraglugga á síðunni, t.d. gegnum Browser-pane eða console):
 *     await Lygaprof.keyra()                  // allir skráðir takkar
 *     await Lygaprof.keyra({ sia: 'buid' })   // aðeins þeir sem passa
 *     Lygaprof.skyrsla()                      // síðasta niðurstaða aftur
 */
(function () {
  'use strict';

  /* ── Texti sem FULLYRÐIR að aðgerð sé um garð gengin ──────────────────── */
  const FULLYRDING = /(✓|✅|🟢|💾|🎯)|\b(vista(ð|d)(ur|ar)?|sent|sendur|send|klára(ð|d)|klárt|búi(ð|d)|loki(ð|d)|staðfest|samþykkt|skrá(ð|d)|stofna(ð|d)|fært|fluttir?)\b/i;
  /* Undantekningar: texti sem VIÐURKENNIR bilun telst ekki fullyrðing. */
  const VIDURKENNIR = /(EKKI|ekki|mistók|villa|villu|⚠|❌|brást|náðist ekki|tókst ekki)/;

  const S = { sagt: [], stodvud: 0, hleypt: 0, nidur: [], virkt: false };

  /* ── Stúfun ───────────────────────────────────────────────────────────── */
  const VILLA = { error: { message: 'LYGAPRÓF: skrifið var stöðvað viljandi', code: 'LYGAPROF' }, data: null, status: 500 };
  const SKRIF = ['update', 'insert', 'upsert', 'delete'];
  let afturkalla = [];

  function biðlari() {
    return (window.DB && window.DB.sb)
      || (window.supabaseClient)
      || (typeof getSB === 'function' && getSB())
      || null;
  }

  /** Hlutur sem svarar öllum keðjuköllum og skilar villu þegar beðið er eftir honum. */
  function villuKedja() {
    const p = new Proxy(function () {}, {
      get(_, lykill) {
        if (lykill === 'then') return (fn) => Promise.resolve(VILLA).then(fn);
        if (lykill === 'catch' || lykill === 'finally') return () => p;
        if (lykill === 'error') return VILLA.error;
        if (lykill === 'data') return null;
        return () => p;
      },
      apply() { return p; },
    });
    return p;
  }

  function stufa() {
    if (S.virkt) return;
    const sb = biðlari();
    if (!sb) throw new Error('Fann engan Supabase-biðlara — er síðan fullhlaðin?');

    // 1. Töfluskrif. Stúfað á biðlaranum sjálfum svo það nái til allra lokana.
    const raunFrom = sb.from.bind(sb);
    sb.from = function (tafla) {
      const q = raunFrom(tafla);
      for (const adgerd of SKRIF) {
        if (typeof q[adgerd] !== 'function') continue;
        q[adgerd] = function () { S.stodvud++; return villuKedja(); };
      }
      return q;
    };
    afturkalla.push(() => { sb.from = raunFrom; });

    // 2. Geymsla (myndir, viðhengi).
    if (sb.storage && typeof sb.storage.from === 'function') {
      const raunGeymsla = sb.storage.from.bind(sb.storage);
      sb.storage.from = function (fata) {
        const b = raunGeymsla(fata);
        ['upload', 'remove', 'move', 'copy'].forEach((a) => {
          if (typeof b[a] === 'function') b[a] = async function () { S.stodvud++; return VILLA; };
        });
        return b;
      };
      afturkalla.push(() => { sb.storage.from = raunGeymsla; });
    }

    // 3. Stillingavistun.
    if (window.AppSettings && typeof window.AppSettings.save === 'function') {
      const raunSave = window.AppSettings.save;
      window.AppSettings.save = async function () { S.stodvud++; return false; };
      afturkalla.push(() => { window.AppSettings.save = raunSave; });
    }

    // 4. Netköll sem BREYTA. GET fær að fara í gegn svo viðmótið haldi áfram að lesa.
    const raunFetch = window.fetch;
    window.fetch = function (inn, valk) {
      const adferd = String((valk && valk.method) || (inn && inn.method) || 'GET').toUpperCase();
      if (adferd === 'GET' || adferd === 'HEAD') { S.hleypt++; return raunFetch.apply(this, arguments); }
      S.stodvud++;
      return Promise.resolve(new Response(JSON.stringify({ error: 'LYGAPRÓF: stöðvað' }),
        { status: 500, headers: { 'content-type': 'application/json' } }));
    };
    afturkalla.push(() => { window.fetch = raunFetch; });

    /* ── Upptaka á öllu sem notandinn sér ───────────────────────────────── */
    if (window.Toast && typeof window.Toast.show === 'function') {
      const raun = window.Toast.show;
      window.Toast.show = function (m) { S.sagt.push({ hvadan: 'toast', txt: String(m) }); return raun.apply(this, arguments); };
      afturkalla.push(() => { window.Toast.show = raun; });
    }
    const raunAlert = window.alert;
    window.alert = function (m) { S.sagt.push({ hvadan: 'alert', txt: String(m) }); };
    afturkalla.push(() => { window.alert = raunAlert; });

    // Staðfestingargluggar: játa, svo flæðið haldi áfram — skrifin eru hvort eð er stöðvuð.
    const raunConfirm = window.confirm;
    window.confirm = function () { return true; };
    afturkalla.push(() => { window.confirm = raunConfirm; });
    if (window.Confirm && typeof window.Confirm.show === 'function') {
      const raun = window.Confirm.show;
      window.Confirm.show = async function () { return true; };
      afturkalla.push(() => { window.Confirm.show = raun; });
    }

    S.virkt = true;
  }

  function afstufa() {
    afturkalla.reverse().forEach((f) => { try { f(); } catch (_) {} });
    afturkalla = [];
    S.virkt = false;
  }

  /* ── Textabreytingar í DOM taldar með því sem „sést" ───────────────────── */
  function vaktaText() {
    const fyrir = new Map();
    document.querySelectorAll('button, .btn, [data-act], [data-t5], ._bk-notes-saved, [id$="-status"], [id$="-msg"]')
      .forEach((el) => fyrir.set(el, el.textContent));
    return () => {
      const breytt = [];
      fyrir.forEach((gamalt, el) => {
        if (!el.isConnected) return;
        const nytt = el.textContent;
        if (nytt !== gamalt) breytt.push({ hvadan: 'texti', txt: String(nytt).trim().slice(0, 120) });
      });
      return breytt;
    };
  }

  /* ── Eitt próf: smella og dæma ────────────────────────────────────────── */
  async function profaTakka(el, heiti) {
    S.sagt = [];
    const stodvudFyrir = S.stodvud;
    const lesBreytingar = vaktaText();

    try { el.click(); } catch (e) { return { heiti, stada: 'villa', skyring: 'smellur kastaði: ' + (e.message || e) }; }
    await new Promise((r) => setTimeout(r, 900));

    const sest = S.sagt.concat(lesBreytingar());
    const stodvud = S.stodvud - stodvudFyrir;
    const lygar = sest.filter((x) => FULLYRDING.test(x.txt) && !VIDURKENNIR.test(x.txt));

    if (!stodvud) {
      return { heiti, stada: 'ósnert', skyring: 'engu skrifi var afstýrt — takkinn skrifar ekkert (eða prófið nær ekki til hans)', sest };
    }
    if (lygar.length) {
      return { heiti, stada: 'LÝGUR', skyring: stodvud + ' skrif stöðvuð, en sagt: „' + lygar[0].txt + '"', sest };
    }
    const vidurkenning = sest.find((x) => VIDURKENNIR.test(x.txt));
    return {
      heiti,
      stada: vidurkenning ? 'satt' : 'þögull',
      skyring: vidurkenning
        ? stodvud + ' skrif stöðvuð, sagt: „' + vidurkenning.txt.slice(0, 90) + '"'
        : stodvud + ' skrif stöðvuð — og ekkert sagt. Notandinn veit ekki að það mistókst.',
      sest,
    };
  }

  /* ── Finnur takka sem lofa útkomu ─────────────────────────────────────── */
  function finnaTakka(sia) {
    const LOFAR = /(vista|senda|sent|klára|ljúka|staðfest|samþykk|skrá|stofna|merkja|búið|rukka|fært|fjarlægja|eyða)/i;
    const ut = [];
    document.querySelectorAll('button, [role="button"], .btn, [data-act], [data-t5]').forEach((el) => {
      if (!el.isConnected || el.disabled) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;                       // ósýnilegur
      const txt = (el.textContent || el.title || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      if (!txt || txt.length > 60) return;
      if (!LOFAR.test(txt)) return;
      if (sia && !new RegExp(sia, 'i').test(txt + ' ' + (el.dataset.act || '') + ' ' + (el.dataset.t5 || ''))) return;
      ut.push({ el, heiti: txt.slice(0, 46) + (el.dataset.act ? ' [' + el.dataset.act + ']' : '') });
    });
    return ut;
  }

  /* ── Keyrsla ──────────────────────────────────────────────────────────── */
  async function keyra(valk) {
    valk = valk || {};
    const takkar = finnaTakka(valk.sia);
    if (!takkar.length) {
      console.warn('[lygapróf] fann enga takka sem lofa útkomu á þessari síðu.');
      return { nidur: [], skyring: 'engir takkar' };
    }
    stufa();
    S.nidur = [];
    try {
      for (const t of takkar.slice(0, valk.hamark || 25)) {
        if (!t.el.isConnected) continue;                        // viðmótið endurteiknaði
        S.nidur.push(await profaTakka(t.el, t.heiti));
      }
    } finally {
      afstufa();
    }
    skyrsla();
    return { nidur: S.nidur, stodvud: S.stodvud };
  }

  function skyrsla() {
    const talning = {};
    S.nidur.forEach((n) => { talning[n.stada] = (talning[n.stada] || 0) + 1; });
    console.log('\n═══ LYGAPRÓF — ' + S.nidur.length + ' takkar, öll skrif stöðvuð ═══');
    console.log(Object.entries(talning).map(([k, v]) => k + ': ' + v).join(' · ') + '\n');
    const rod = { 'LÝGUR': 0, 'þögull': 1, satt: 2, 'ósnert': 3, villa: 4 };
    S.nidur.slice().sort((a, b) => rod[a.stada] - rod[b.stada]).forEach((n) => {
      const merki = { 'LÝGUR': '❌', 'þögull': '🟡', satt: '✅', 'ósnert': '·', villa: '⚠' }[n.stada];
      console.log(merki + ' ' + n.stada.padEnd(7) + ' ' + n.heiti.padEnd(48) + ' ' + n.skyring);
    });
    const lygar = S.nidur.filter((n) => n.stada === 'LÝGUR');
    console.log('\n' + (lygar.length
      ? '❌ FELLUR — ' + lygar.length + ' takkar fullyrða árangur þótt ekkert hafi vistast.'
      : '✅ Enginn takki laug á þessari síðu.'));
    return S.nidur;
  }

  window.Lygaprof = { keyra, skyrsla, finnaTakka, get stada() { return S; } };
  console.log('[lygapróf] tilbúið — Lygaprof.keyra()');
})();
