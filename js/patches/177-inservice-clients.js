/* === IN-SERVICE CLIENTS (active uttaeki) v1 ===
 *
 * 2026-06-01: Source-of-truth for "is this company in service?" moved from the
 * manual `arsskodun_customers` snapshot to the real `uttaeki` equipment table
 * (see patch 153's Fyrirtæki í Þjónustu list). But two consumers still keyed
 * off the manual snapshot only:
 *   • patch 156 geocode-prewarm  → never geocoded uttaeki-only companies, so
 *   • patch 161 Leiðsögn         → ~199 of 439 in-service addresses had no pin.
 *
 * This tiny shared module loads ONCE at boot which companies have ≥1 unit in
 * use in `uttaeki` — BÆÐI á auðkenni (`fyrirtaeki_id`) og á folduðu nafni
 * (`client`, foldað eins og patch 153 gerir).
 *
 * 2026-09-08: settið bar áður AÐEINS nafnið. Endurnefnt félag — eða tæki sem
 * var stofnað með gamla nafninu í minni — datt því út úr „er í þjónustu" og þar
 * með af akstursleiðum (219), korti (178), leiðsögn (161) og þjónustuyfirliti
 * (185), þótt tækin væru til og rétt tengd. Mælt á fyrirtaeki 1570.
 *
 * NOTAÐU `hasCo(co)` — hún tekur félagshlutinn, lætur auðkennið ráða og fellur
 * á nafnið aðeins þegar auðkennið þekkist ekki. `has(nafn)` stendur eftir fyrir
 * kallendur sem hafa ekkert nema nafn.
 *
 *   window.InServiceClients.ready()   → Promise<Set<foldedName>>
 *   window.InServiceClients.hasCo(co) → boolean  ← notaðu þessa
 *   window.InServiceClients.hasId(id) → boolean
 *   window.InServiceClients.has(nafn) → boolean (false until loaded)
 *   window.InServiceClients.loaded()  → boolean
 *   window.InServiceClients.onReady(fn)
 */
(() => {
  if (window.InServiceClients) return;

  // Same fold as patch 153 — keep identical so the in-service set matches the
  // Fyrirtæki í Þjónustu list exactly.
  function foldName(s) {
    return String(s || '').toLowerCase().trim()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/æ/g, 'ae').replace(/ö/g, 'o')
      .replace(/[.,]/g, '')          // 2026-06-02: keep identical to patch 153 — ignore
      .replace(/\s+/g, ' ').trim();  // punctuation so renames don't break the name match
  }

  // 2026-09-08: settið bar AÐEINS foldað nafn. Endurnefnt félag (eða tæki
  // stofnað með gamla nafninu í minni) datt því út úr „er í þjónustu" og þar
  // með af akstursleiðum, korti og leiðsögn — þótt tækin væru til og rétt
  // tengd. Nú fylgir auðkennis-sett með og `hasId()` er rétta leiðin.
  let _set = null;            // Set<foldedName> with ≥1 active unit
  let _ids = null;            // Set<fyrirtaeki_id> með ≥1 tæki í notkun
  let _promise = null;
  const _listeners = [];

  async function fetchSet() {
    const out = new Set();
    const idOut = new Set();
    if (!window.SUPABASE_URL || !window.SUPABASE_KEY) return out;
    try {
      let from = 0; const page = 1000;
      while (true) {
        // 2026-09-01: Í NOTKUN = allt NEMA 'urelt'. Áður .eq('status','active').
        // `uttaeki.status` ber FJÖGUR gildi — active 4891 · urelt 482 · „Í lagi“ 154 · ok 74
        // — svo sían á 'active' faldi 228 tæki á 17 fyrirtækjum. FJÓRTÁN þeirra eiga
        // ekkert 'active' og litu því út fyrir að vera ALVEG TÓM: Bríetartún (48),
        // Dalbrekka (48), bílskúrinn (16), Dra ehf (37), Iceland Comfort (15).
        // Mælt fyrir breytingu: hjá SEX þeirra fer afleidda talan að stemma við
        // arsskodun-blobbinn sem þegar var réttur — sterkasta vísbendingin um að sían
        // var villan, ekki gögnin. Vörður: tools/audit-status-gildi.cjs.
        const r = await fetch(
          window.SUPABASE_URL + '/rest/v1/uttaeki?select=client,fyrirtaeki_id&status=neq.urelt',
          {
            headers: {
              apikey: window.SUPABASE_KEY,
              Authorization: 'Bearer ' + window.SUPABASE_KEY,
              Range: from + '-' + (from + page - 1),
            },
          }
        );
        if (!r.ok) break;
        const rows = await r.json();
        if (!Array.isArray(rows) || !rows.length) break;
        rows.forEach(x => {
          if (!x) return;
          if (x.client) out.add(foldName(x.client));
          if (x.fyrirtaeki_id != null) idOut.add(+x.fyrirtaeki_id);
        });
        if (rows.length < page) break;
        from += page;
      }
    } catch (e) {
      console.warn('[inservice] fetch error', e);
    }
    return { nofn: out, ids: idOut };
  }

  function ready() {
    if (_promise) return _promise;
    _promise = fetchSet().then(r => {
      _set = r.nofn; _ids = r.ids;
      console.log('[inservice] loaded', _set.size, 'nöfn /', _ids.size, 'auðkenni með tæki í notkun');
      _listeners.splice(0).forEach(fn => { try { fn(); } catch (_) {} });
      return _set;
    });
    return _promise;
  }

  window.InServiceClients = {
    ready,
    has: nafn => (_set ? _set.has(foldName(nafn)) : false),
    // Auðkennið ræður. `hasCo(co)` er leiðin sem kallendur eiga að nota þegar
    // þeir hafa félagshlutinn — hún þolir endurnefningu.
    hasId: id => (_ids ? _ids.has(+id) : false),
    hasCo: co => {
      if (!co) return false;
      if (_ids && co.id != null && _ids.has(+co.id)) return true;
      return _set ? _set.has(foldName(co.nafn)) : false;
    },
    loaded: () => _set !== null,
    onReady: fn => { if (_set) { try { fn(); } catch (_) {} } else _listeners.push(fn); },
  };

  // Eager load at boot — both consumers run after the customer list settles,
  // by which point this is almost always resolved.
  ready();

  console.log('[inservice-clients v1] installed');
})();
/* === END IN-SERVICE CLIENTS === */
