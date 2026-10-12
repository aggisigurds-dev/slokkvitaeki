/* === 460 — SAGA TÆKIS: „nýtt 2024 · skoðað 2025 · skoðað 2026" =============
 *
 * Agnar 12.10.2026, með skjáskoti af Verkspjaldinu og rauðum kassa teiknuðum
 * beint undir raðnúmerið á tækjalínunni:
 *   „að geta skráð sögu á tæki.. hvenær það var nýtt. ár.. hvaða ár skoðað og
 *    hlaðið, svo ég sjái td hvenær þarf að hlaða næst"
 *   „að sé kanski svona lína nýtt.2024. skoðað. 2025. skoðað 2026. í kanski
 *    einhvernskonar litamiða"
 *
 * AF HVERJU ÞETTA ÞURFTI NÝJA TÖFLU — mælt þennan dag:
 *   · `DB.addInspection` SKRIFAR YFIR `uttaeki.last_insp/next_insp/status`.
 *     Hver skoðun eyðir þeirri á undan. 6.189 tæki bera dagsetningu — en
 *     aðeins þá nýjustu. Sagan var ekki geymd, hún var jöfnuð út.
 *   · `verklidur` (1.151 raðir) er ekki saga heldur: aðeins 40 tengjast
 *     tækisröð og EKKERT raðnúmer á fleiri en eina komu.
 *
 * Taflan `taeki_saga` er því ný og VIÐBÓT — ekkert eldra var snert. Hún var
 * bakfyllt úr því eina sem grunnurinn mundi: 6.577 „skoðað" (2020–2026) og
 * 661 „hlaðið" (2026).
 *
 * „NÝTT" ER TÓMT OG VERÐUR ÞAÐ ÞAR TIL ÞÚ SKRÁIR ÞAÐ. `uttaeki.created_at` er
 * dagurinn sem RÖÐIN varð til (mest innflutningur 2026), ekki dagurinn sem
 * TÆKIÐ var nýtt. Að nota hann sem „nýtt" væri ágiskun sem lítur út eins og
 * staðreynd, og hún myndi standa á miðanum um ókomna tíð. Miðinn sýnir því
 * „nýtt —" og takka til að skrá ártalið.
 *
 * LYKILLINN ER TÆKISRÖÐIN, EKKI STRENGURINN. Agnar sama dag: „engin raðnúmer
 * skipta í raun máli ennþá, en fer svona bráðum að fara skrá þau sérstaklega."
 * Flest raðnúmer eru tilbúin (FC260-*, TMP-*, AE2026…). Sagan hangir því á
 * `uttaeki_id` þegar hún er til og fellur aðeins á `serial` fyrir borðs-tæki
 * sem urðu aldrei að skráðu tæki. Þegar raunveruleg raðnúmer koma breytist
 * ekkert — röðin heldur sínu `uttaeki_id`.
 */
(() => {
  if (window.TaekiSaga) return;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sb = () => (window.DB && DB.sb) || null;

  // Litamiðinn: hver viðburður á sinn lit svo röðin lesist í einu augnakasti.
  const LITIR = {
    nytt:     { heiti: 'nýtt',     bg: '#064e3b', bor: '#065f46', txt: '#d1fae5' },
    skodad:   { heiti: 'skoðað',   bg: '#1e293b', bor: '#334155', txt: '#e2e8f0' },
    hladid:   { heiti: 'hlaðið',   bg: '#78350f', bor: '#92400e', txt: '#fef3c7' },
    onytt:    { heiti: 'ónýtt',    bg: '#7f1d1d', bor: '#991b1b', txt: '#fee2e2' },
    mottekid: { heiti: 'móttekið', bg: '#1e3a5f', bor: '#1e40af', txt: '#dbeafe' },
    tilbuid:  { heiti: 'tilbúið',  bg: '#14532d', bor: '#166534', txt: '#dcfce7' }
  };
  // Röðin á miðanum: nýtt fremst, svo árin í tímaröð. Innan sama árs ræður þessi röð.
  const ROD = ['nytt', 'hladid', 'skodad', 'onytt', 'mottekid', 'tilbuid'];

  /* Skyndiminni per lykli. Teikningin er samstillt (430 byggir streng), svo
   * sagan verður að vera komin ÁÐUR en teiknað er — annars blikkar miðinn inn
   * eftir á. `saekja()` fyllir minnið og kallar á endurteikningu EINU SINNI. */
  const minni = new Map();      // lykill → [færslur]
  let sottir = new Set();       // lyklar sem búið er að spyrja um (líka þeir tómu)

  const lykill = u => (u && u.uttaeki_id != null) ? 'u:' + u.uttaeki_id
    : (u && u.serial) ? 's:' + String(u.serial).trim() : null;

  async function saekja(taeki, eftirA) {
    const SB = sb();
    if (!SB || !Array.isArray(taeki) || !taeki.length) return;
    const uIds = [], sers = [];
    for (const u of taeki) {
      const k = lykill(u);
      if (!k || sottir.has(k)) continue;
      sottir.add(k);
      if (k.startsWith('u:')) uIds.push(Number(k.slice(2)));
      else sers.push(k.slice(2));
    }
    if (!uIds.length && !sers.length) return;
    try {
      const kall = [];
      if (uIds.length) kall.push(SB.from('taeki_saga')
        .select('id,serial,uttaeki_id,ar,vidburdur,dags,skyring')
        .in('uttaeki_id', uIds).limit(1000));
      if (sers.length) kall.push(SB.from('taeki_saga')
        .select('id,serial,uttaeki_id,ar,vidburdur,dags,skyring')
        .is('uttaeki_id', null).in('serial', sers).limit(1000));
      const svor = await Promise.all(kall);
      for (const r of svor) {
        // Tómt svar er ekki staðreynd: villa má ekki festast í minninu sem
        // „engin saga" — þá sæist hún aldrei þótt hún væri til.
        if (r.error) { for (const k of [...sottir]) if (!minni.has(k)) sottir.delete(k); continue; }
        for (const f of (r.data || [])) {
          const k = f.uttaeki_id != null ? 'u:' + f.uttaeki_id : 's:' + f.serial;
          if (!minni.has(k)) minni.set(k, []);
          minni.get(k).push(f);
        }
      }
    } catch (_) {
      for (const k of [...sottir]) if (!minni.has(k)) sottir.delete(k);
      return;
    }
    if (typeof eftirA === 'function') eftirA();
  }

  function faerslur(u) {
    const k = lykill(u);
    if (!k) return [];
    const f = (minni.get(k) || []).slice();
    f.sort((a, b) => (a.ar - b.ar) || (ROD.indexOf(a.vidburdur) - ROD.indexOf(b.vidburdur)));
    return f;
  }

  /* Miðinn sjálfur. Skilar TÓMUM streng þegar engin saga er til OG tækið á
   * enga tækisröð — þá er ekkert að segja og auð lína er betri en „engin saga". */
  function linaHtml(u) {
    const f = faerslur(u);
    const k = lykill(u);
    if (!k) return '';
    const flisar = f.map(x => {
      const L = LITIR[x.vidburdur] || LITIR.skodad;
      const titill = [L.heiti + ' ' + x.ar, x.dags ? String(x.dags).split('-').reverse().join('/') : '', x.skyring || '']
        .filter(Boolean).join(' · ');
      return '<span class="tsg-f" title="' + esc(titill) + '" style="background:' + L.bg + ';border-color:' + L.bor + ';color:' + L.txt + '">'
        + esc(L.heiti) + ' <b>' + esc(x.ar) + '</b></span>';
    });
    const erNytt = f.some(x => x.vidburdur === 'nytt');
    // „Nýtt" fremst — tómt þar til það er skráð, aldrei giskað úr created_at.
    // <span role="button">, EKKI <button>: miðinn situr inni í hausnum á tækjalínunni
    // (.vk-h er sjálft <button>), og hnappur inni í hnappi er ógilt HTML sem vafrinn
    // leysir með því að slíta línuna í sundur.
    const nyttFlis = erNytt ? '' :
      '<span role="button" tabindex="0" class="tsg-f tsg-vantar" data-tsg-nytt="' + esc(k) + '" title="Skrá hvaða ár tækið var nýtt">nýtt —</span>';
    return '<div class="tsg">' + nyttFlis + flisar.join('') + '</div>';
  }

  /* Skrá „nýtt <ár>" — eina færslan sem er handvirk, af því að hún er sú eina
   * sem gögnin geta ekki svarað. */
  async function skraNytt(k, ar, u) {
    const SB = sb();
    if (!SB || !k) return false;
    const n = Number(String(ar).replace(/\D/g, ''));
    if (!(n >= 1970 && n <= 2100)) { if (window.Toast) Toast.show('Ártalið „' + ar + '" er ekki gilt'); return false; }
    const rod = {
      serial: (u && u.serial) || (k.startsWith('s:') ? k.slice(2) : ''),
      uttaeki_id: k.startsWith('u:') ? Number(k.slice(2)) : null,
      ar: n, vidburdur: 'nytt',
      heimild: 'skráð handvirkt á Verkspjaldinu', created_by: 'app'
    };
    const r = await SB.from('taeki_saga').insert(rod).select().maybeSingle();
    if (r.error) {
      if (window.Toast) Toast.show('Vistaðist ekki: ' + (r.error.message || 'óþekkt villa'));
      return false;
    }
    if (!minni.has(k)) minni.set(k, []);
    minni.get(k).push(r.data);
    if (window.Toast) Toast.show('✓ Nýtt ' + n + ' skráð');
    return true;
  }

  /* Viðburður skráður sjálfkrafa (t.d. þegar tæki er merkt Tilbúið). Þögult —
   * einkvæmnisvörnin í grunninum sér um að sama árið tvítelist ekki. */
  async function skra(u, vidburdur, skyring) {
    const SB = sb();
    const k = lykill(u);
    if (!SB || !k || !LITIR[vidburdur]) return false;
    const n = new Date();
    const rod = {
      serial: (u && u.serial) || (k.startsWith('s:') ? k.slice(2) : ''),
      uttaeki_id: k.startsWith('u:') ? Number(k.slice(2)) : null,
      ar: n.getFullYear(), vidburdur,
      dags: n.toISOString().slice(0, 10),
      skyring: skyring || null,
      heimild: 'skráð í appinu', created_by: 'app'
    };
    const r = await SB.from('taeki_saga').insert(rod).select().maybeSingle();
    if (r.error) return false;                   // 23505 = þegar skráð þetta ár; það er í lagi
    if (!minni.has(k)) minni.set(k, []);
    minni.get(k).push(r.data);
    return true;
  }

  /* Verkspjaldið (430) teiknar í SHADOW DOM (`#vsp-host`) með `:host{all:initial}`.
   * Stílblað í `document.head` nær ALDREI þangað inn — mælt 12.10.2026: miðinn var
   * réttur í trénu (1 `.tsg` í skugganum) en stíllaus á skjánum, svo hann leit út
   * eins og hann virkaði ekki. Stílarnir fara því í hverja rót sem við finnum.
   * Sami texti, afritaður — skuggarót deilir engu með skjalinu. */
  const TSG_CSS =
      '.tsg{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}' +
      '.tsg-f{display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:999px;' +
        'border:1px solid;font-size:10.5px;line-height:1.7;letter-spacing:.2px;white-space:nowrap}' +
      '.tsg-f b{font-weight:700;font-variant-numeric:tabular-nums}' +
      '.tsg-vantar{background:transparent!important;border-color:#94a3b8!important;color:#94a3b8!important;' +
        'cursor:pointer;font:inherit;font-size:10.5px;border-style:dashed!important}' +
      '.tsg-vantar:hover{border-color:#64748b!important;color:#cbd5e1!important}';
  function stilaRot(rot) {
    if (!rot) return;
    const hafa = rot.getElementById ? rot.getElementById('_tsg-stilar')
      : rot.querySelector('#_tsg-stilar');
    if (hafa) return;
    const el = document.createElement('style');
    el.id = '_tsg-stilar';
    el.textContent = TSG_CSS;
    (rot === document ? document.head : rot).appendChild(el);
  }
  function stilar() {
    stilaRot(document);
    // Skuggarætur koma og fara með glugganum — leitum í hvert sinn.
    document.querySelectorAll('*').forEach(el => { if (el.shadowRoot) stilaRot(el.shadowRoot); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stilar);
  else stilar();
  try {
    new MutationObserver(stilar).observe(document.body || document.documentElement,
      { childList: true, subtree: true });
  } catch (_) {}

  // Smellur á „nýtt —" — einn hlustari á skjalinu svo hann lifi endurteikningar af.
  document.addEventListener('click', async e => {
    // Smellur innan úr Shadow DOM er ENDURMIÐAÐUR á hýsilinn áður en hann nær
    // hingað, svo `e.target` er `#vsp-host` og `closest` finnur ekkert.
    // `composedPath()` ber alla leiðina, líka innan skuggans.
    const leid = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
    const b = leid.find(el => el && el.getAttribute && el.getAttribute('data-tsg-nytt'));
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const k = b.getAttribute('data-tsg-nytt');
    const svar = window.prompt('Hvaða ár var tækið nýtt?', String(new Date().getFullYear()));
    if (svar == null) return;
    if (await skraNytt(k, svar, null)) {
      if (window.Verkspjald && typeof Verkspjald.teikna === 'function') Verkspjald.teikna();
      else if (window.Workshop && Workshop.render) Workshop.render();
    }
  }, true);

  window.TaekiSaga = { saekja, linaHtml, faerslur, skra, skraNytt, lykill, LITIR, _minni: minni };
})();
