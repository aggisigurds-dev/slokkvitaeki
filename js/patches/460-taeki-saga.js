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

  /* LITAMIÐINN — Agnar 12.10.2026, orðrétt:
   *   „2024(Grænt-nýtt) 2025(Grænblátt-skoðað) 2026(Blátt-Hlaðið)"
   *
   * ÁRIÐ er merkið; LITURINN ber merkinguna. Þess vegna stendur aðeins ártalið
   * á flísinni — orðið („nýtt", „skoðað", „hlaðið") fylgir í titlinum ásamt
   * dagsetningu og skýringu, svo liturinn þarf aldrei að vera eina heimildin.
   * Heilir litir með hvítum texta: röðin á að lesast í einu augnakasti á
   * ljósu spjaldi, ekki krefjast þess að maður rýni. */
  const LITIR = {
    nytt:     { heiti: 'nýtt',     staf: 'N', bg: '#16a34a', bor: '#15803d', txt: '#ffffff' },  // grænt
    skodad:   { heiti: 'skoðað',   staf: 'Y', bg: '#0d9488', bor: '#0f766e', txt: '#ffffff' },  // grænblátt (Y = yfirferð)
    hladid:   { heiti: 'hlaðið',   staf: 'H', bg: '#2563eb', bor: '#1d4ed8', txt: '#ffffff' },  // blátt
    onytt:    { heiti: 'ónýtt',    staf: 'Ó', bg: '#dc2626', bor: '#b91c1c', txt: '#ffffff' },
    mottekid: { heiti: 'móttekið', staf: 'M', bg: '#64748b', bor: '#475569', txt: '#ffffff' },
    tilbuid:  { heiti: 'tilbúið',  staf: 'T', bg: '#15803d', bor: '#166534', txt: '#ffffff' }
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
        // Tveggja stafa ár (Agnar: „eða bara 24-N.... 25-Y.... 26-H"). Fulla ártalið
        // stendur í titlinum, svo ekkert tapast — línan á að komast fyrir á tækjalínu.
        + '<b>' + esc(String(x.ar).slice(-2)) + '</b>' + (L.staf ? '<i>-' + esc(L.staf) + '</i>' : '') + '</span>';
    });
    const erNytt = f.some(x => x.vidburdur === 'nytt');
    // „Nýtt" fremst — tómt þar til það er skráð, aldrei giskað úr created_at.
    // <span role="button">, EKKI <button>: miðinn situr inni í hausnum á tækjalínunni
    // (.vk-h er sjálft <button>), og hnappur inni í hnappi er ógilt HTML sem vafrinn
    // leysir með því að slíta línuna í sundur.
    const nyttFlis = erNytt ? '' :
      '<span role="button" tabindex="0" class="tsg-f tsg-vantar" data-tsg-nytt="' + esc(k) + '" title="Skrá hvaða ár tækið var nýtt">nýtt —</span>';
    /* „+" aftast — Agnar 12.10.2026, með krossi teiknuðum við hliðina á flísunum:
     * „geturðu opnað á það að ég geti sett inn fyrri skoðunarár inn í tækið".
     * Bakfyllingin gat aðeins gefið það sem grunnurinn mundi — oftast EITT ár.
     * Árin þar á undan eru til á pappír, hvergi í kerfinu. Þess vegna verður að
     * vera hægt að slá þau inn OG taka þau út aftur: handfærsla sem ekki verður
     * leiðrétt er verri en engin. */
    const heiti = [u && u.type, u && u.size].filter(Boolean).join(' ') || (u && u.service) || '';
    const plus = '<span role="button" tabindex="0" class="tsg-f tsg-plus" data-tsg-ritill="' + esc(k) +
      '" data-tsg-heiti="' + esc(heiti) + '" data-tsg-ser="' + esc((u && u.serial) || '') +
      '" title="Bæta við eða laga ár í sögu tækisins">+</span>';
    return '<div class="tsg">' + nyttFlis + flisar.join('') + plus + '</div>';
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
      '.tsg-f{display:inline-flex;align-items:center;padding:1px 8px;border-radius:999px;' +
        'border:1px solid;font-size:11px;line-height:1.75;white-space:nowrap}' +
      '.tsg-f b{font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.3px}' +
      '.tsg-f i{font-style:normal;font-weight:700;opacity:.85;letter-spacing:.3px}' +
      '.tsg-vantar{background:transparent!important;border-color:#94a3b8!important;color:#94a3b8!important;' +
        'cursor:pointer;font:inherit;font-size:10.5px;border-style:dashed!important}' +
      '.tsg-vantar:hover{border-color:#64748b!important;color:#cbd5e1!important}' +
      '.tsg-plus{background:transparent!important;border-color:#94a3b8!important;color:#64748b!important;' +
        'cursor:pointer;font-weight:700;padding:1px 9px;border-style:dashed!important}' +
      '.tsg-plus:hover{border-color:#2563eb!important;color:#2563eb!important}' +
      '#_tsg-ov{position:fixed;inset:0;background:rgba(10,12,18,.55);z-index:100001;display:flex;' +
        'align-items:center;justify-content:center;padding:16px}' +
      '#_tsg-glugg{background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.34);' +
        'width:min(460px,100%);max-height:calc(100vh - 32px);overflow:auto;' +
        'font:13px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#334155}' +
      '._tsg-hd{display:flex;justify-content:space-between;align-items:center;gap:10px;' +
        'padding:12px 16px;background:#141822;color:#fff;font-size:15px}' +
      '._tsg-hd button{background:transparent;border:1px solid rgba(255,255,255,.3);color:#fff;' +
        'font-size:17px;width:30px;height:30px;border-radius:7px;cursor:pointer;line-height:1}' +
      '._tsg-sub{padding:9px 16px 0;color:#64748b;font-size:12px}' +
      '._tsg-listi{padding:8px 16px}' +
      '._tsg-r{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #eef2f7}' +
      '._tsg-n{flex:1;min-width:0;color:#475569;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '._tsg-x{border:1px solid #e2e8f0;background:#fff;color:#94a3b8;border-radius:7px;' +
        'width:26px;height:26px;cursor:pointer;font-size:12px;line-height:1;flex:none}' +
      '._tsg-x:hover{border-color:#dc2626;color:#dc2626}' +
      '._tsg-tomt{color:#94a3b8;font-size:12px;padding:4px 0}' +
      '._tsg-baeta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:10px 16px;' +
        'border-top:1px solid #eef2f7}' +
      '._tsg-baeta label{display:flex;align-items:center;gap:5px;color:#475569;font-size:12px}' +
      '._tsg-baeta input{width:74px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:8px;' +
        'font:inherit;font-size:13px;font-variant-numeric:tabular-nums}' +
      '._tsg-t{border:1px solid;border-radius:999px;color:#fff;padding:5px 11px;cursor:pointer;' +
        'font:inherit;font-size:12px;font-weight:700}' +
      '._tsg-hint{padding:0 16px 14px;color:#94a3b8;font-size:11.5px}';
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

  /* ── RITILL SÖGUNNAR ─────────────────────────────────────────────────────
   * Teiknaður í `document.body`, EKKI inni í skugganum: Verkspjaldið lifir í
   * `#vsp-host` með `:host{all:initial}`, svo gluggi þar inni erfði hvorki stíla
   * né kæmist yfir yfirlagið. Utan skuggans er hann venjulegur gluggi. */
  const TEG = [
    ['nytt', 'nýtt'], ['skodad', 'skoðað'], ['hladid', 'hlaðið'], ['onytt', 'ónýtt']
  ];

  function lokaRitli() { const el = document.getElementById('_tsg-ov'); if (el) el.remove(); }

  function ritillHtml(k, heiti, ser) {
    const gervi = {
      uttaeki_id: k.indexOf('u:') === 0 ? Number(k.slice(2)) : null,
      serial: k.indexOf('s:') === 0 ? k.slice(2) : ser
    };
    const f = faerslur(gervi);
    const radir = f.length ? f.map(x => {
      const Li = LITIR[x.vidburdur] || LITIR.skodad;
      return '<div class="_tsg-r">' +
        '<span class="tsg-f" style="background:' + Li.bg + ';border-color:' + Li.bor + ';color:' + Li.txt + '">' +
          '<b>' + esc(String(x.ar).slice(-2)) + '</b>' + (Li.staf ? '<i>-' + esc(Li.staf) + '</i>' : '') + '</span>' +
        '<span class="_tsg-n">' + esc(Li.heiti) + ' ' + esc(x.ar) +
          (x.dags ? ' · ' + esc(String(x.dags).split('-').reverse().join('/')) : '') +
          (x.skyring ? ' · ' + esc(String(x.skyring).slice(0, 44)) : '') + '</span>' +
        (x.id ? '<button type="button" class="_tsg-x" data-tsg-eyda="' + esc(x.id) + '" title="Taka þessa færslu út">✕</button>' : '') +
        '</div>';
    }).join('') : '<div class="_tsg-tomt">Engin saga skráð enn.</div>';
    return '<div class="_tsg-hd"><b>Saga tækisins</b><button type="button" id="_tsg-x">✕</button></div>' +
      '<div class="_tsg-sub">' + esc(heiti || 'Tæki') + (ser ? ' · ' + esc(ser) : '') + '</div>' +
      '<div class="_tsg-listi">' + radir + '</div>' +
      '<div class="_tsg-baeta">' +
        '<label>Ár <input id="_tsg-ar" type="number" inputmode="numeric" min="1970" max="2100" placeholder="' + (new Date().getFullYear() - 1) + '"></label>' +
        TEG.map(function (t) { const Li = LITIR[t[0]];
          return '<button type="button" class="_tsg-t" data-tsg-baeta="' + t[0] + '" style="background:' + Li.bg + ';border-color:' + Li.bor + '">' +
            (Li.staf ? Li.staf + ' · ' : '') + esc(t[1]) + '</button>'; }).join('') +
      '</div>' +
      '<div class="_tsg-hint">Sláðu inn ártal og veldu hvað gerðist það ár. Hvert ár getur borið hvern viðburð einu sinni.</div>';
  }

  function opnaRitil(k, heiti, ser) {
    lokaRitli();
    stilar();
    const ov = document.createElement('div');
    ov.id = '_tsg-ov';
    ov.innerHTML = '<div id="_tsg-glugg"></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) lokaRitli(); });

    function teiknaRitil() {
      const g = document.getElementById('_tsg-glugg');
      if (!g) return;
      g.innerHTML = ritillHtml(k, heiti, ser);
      const x = g.querySelector('#_tsg-x');
      if (x) x.addEventListener('click', lokaRitli);
      g.querySelectorAll('[data-tsg-baeta]').forEach(function (b) {
        b.addEventListener('click', async function () {
          const ar = g.querySelector('#_tsg-ar');
          if (!ar || !String(ar.value || '').trim()) {
            if (ar) ar.focus();
            if (window.Toast) Toast.show('Sláðu inn ártal fyrst');
            return;
          }
          if (await baetaVid(k, ar.value, b.getAttribute('data-tsg-baeta'), ser)) {
            teiknaRitil();
            endurteikna();
          }
        });
      });
      g.querySelectorAll('[data-tsg-eyda]').forEach(function (b) {
        b.addEventListener('click', async function () {
          if (await eyda(k, Number(b.getAttribute('data-tsg-eyda')))) {
            teiknaRitil();
            endurteikna();
          }
        });
      });
      const ar = g.querySelector('#_tsg-ar');
      if (ar) ar.focus();
    }
    teiknaRitil();
  }

  function endurteikna() {
    if (window.Verkspjald && typeof Verkspjald.teikna === 'function') Verkspjald.teikna();
    else if (window.Workshop && Workshop.render) Workshop.render();
  }

  /* Handfærsla ber ÁR en enga dagsetningu. Við vitum árið, ekki daginn, og
   * dagsetning sem við fyndum upp á liti út eins og mæling. */
  async function baetaVid(k, ar, vidburdur, ser) {
    const SB = sb();
    if (!SB || !k || !LITIR[vidburdur]) return false;
    const nAr = Number(String(ar).replace(/\D/g, ''));
    if (!(nAr >= 1970 && nAr <= 2100)) {
      if (window.Toast) Toast.show('Ártalið er ekki gilt');
      return false;
    }
    const rod = {
      serial: ser || (k.indexOf('s:') === 0 ? k.slice(2) : ''),
      uttaeki_id: k.indexOf('u:') === 0 ? Number(k.slice(2)) : null,
      ar: nAr,
      vidburdur: vidburdur,
      heimild: 'slegið inn handvirkt á Verkspjaldinu',
      created_by: 'app'
    };
    const r = await SB.from('taeki_saga').insert(rod).select().maybeSingle();
    if (r.error) {
      const tvitak = String(r.error.code || '') === '23505';
      if (window.Toast) Toast.show(tvitak
        ? (LITIR[vidburdur].heiti + ' ' + nAr + ' er þegar skráð')
        : ('Vistaðist ekki: ' + (r.error.message || '')));
      return false;
    }
    if (!minni.has(k)) minni.set(k, []);
    minni.get(k).push(r.data);
    if (window.Toast) Toast.show('✓ ' + LITIR[vidburdur].heiti + ' ' + nAr + ' skráð');
    return true;
  }

  async function eyda(k, id) {
    const SB = sb();
    if (!SB || !id) return false;
    const r = await SB.from('taeki_saga').delete().eq('id', id);
    if (r.error) {
      if (window.Toast) Toast.show('Tókst ekki að eyða: ' + (r.error.message || ''));
      return false;
    }
    const listi = minni.get(k);
    if (listi) minni.set(k, listi.filter(x => Number(x.id) !== Number(id)));
    return true;
  }

  // Smellur á „+" — sama composedPath-leið og „nýtt —", því hvort tveggja situr
  // inni í skuggarót Verkspjaldsins.
  document.addEventListener('click', function (e) {
    const leid = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
    const b = leid.find(el => el && el.getAttribute && el.getAttribute('data-tsg-ritill'));
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    opnaRitil(b.getAttribute('data-tsg-ritill'), b.getAttribute('data-tsg-heiti'), b.getAttribute('data-tsg-ser'));
  }, true);

  window.TaekiSaga = { saekja, linaHtml, faerslur, skra, skraNytt, baetaVid, eyda, opnaRitil, lykill, LITIR, _minni: minni };
})();
