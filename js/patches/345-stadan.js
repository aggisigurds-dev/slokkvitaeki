/* === STAÐAN — fjórar tölur sem segja hvort kerfið sé í lagi (345) ==========
 *
 * Agnar 2026-08-31: „er ekki hægt að setja þetta einhvern veginn upp að ég sjái
 * stöðuna og þið reynið að hjálpa með það. ekki bara hlaupandi á eftir mér að
 * skvettandi á elda sem eru búnir að brenna allt."
 *
 * Þetta er ekki spjall og ekki aðstoðarmaður. Það er SÍÐA SEM SÝNIR STÖÐUNA.
 * Hún hleðst með appinu, þarf enga uppsetningu, engan API-lykil, ekkert SQL og
 * ekkert minni. Hún les gögnin sem eru þegar til og reiknar fjórar tölur.
 *
 * ── AF HVERJU ÞESSAR FJÓRAR ───────────────────────────────────────────────
 * Agnar sagði nákvæmlega hvað hann þarf að geta treyst:
 *   „ad eg se ad senda driver a retta stadi. og senda retta reikninga og
 *    hvort eg se med alla a skra sem eru i þjonustu"
 * og síðar: hvað síðasta skýrslan og reikningurinn innihéldu.
 *
 *   1  Í þjónustu en engin tæki skráð   → ósýnileg í Ársskoðun að eilífu
 *   2  Komin á tíma, á engum aksturslista → enginn er á leiðinni þangað
 *   3  Skoðuð í ár en hvorki sala né reikningur → unnið, ekki rukkað
 *   4  Rukkuð tæki vs skráð tæki → skráin eða reikningurinn er skakkur
 *
 * Mælt 31.08.2026 þegar þetta var skrifað: 260 · 25 · 30 · 10.
 * Talan 1 er orsökin á bak við hinar þrjár — sé tækið ekki skráð er ekki hægt
 * að vita hvern á að heimsækja, hvað á að rukka, né hvað var í skýrslunni.
 *
 * ── HVAÐ ÞETTA GERIR EKKI ─────────────────────────────────────────────────
 * Það breytir ENGU. Engin skrif, engin sjálfvirk lokun, engin ákvörðun tekin
 * fyrir Agnar. Það sýnir töluna og listann á bak við hana. Hvað er gert við
 * hann er hans mál.
 * ========================================================================== */
(() => {
  if (window.__stadan345) return;
  window.__stadan345 = true;

  // NB: VIEW_ID verður að vera `view-{NAV_KEY}` svo URL-beinirinn (218) finni hana.
  const VIEW_ID = 'view-stadan';
  const NAV_KEY = 'stadan';
  const AR = new Date().getFullYear();

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const SB = () => (window.DB && window.DB.sb) || null;

  /* Supabase skilar 1000 línum í mesta lagi. fyrirtaeki eru 1284 og solur
     fleiri — án síðuskiptingar vantaði hluta og tölurnar yrðu of lágar. */
  async function allar(tafla, select, filt) {
    const sb = SB(); if (!sb) return [];
    let out = [], from = 0;
    for (;;) {
      let q = sb.from(tafla).select(select).range(from, from + 999);
      if (filt) q = filt(q);
      const { data, error } = await q;
      // KASTA, EKKI ÞEGJA. Fyrsta útgáfan gerði `if (error) break` og skilaði
      // tómu fylki þegar ég hafði beðið um dálk sem er ekki til
      // (fyrirtaeki.stadur). Síðan sýndi þá NÚLL á öllum fjórum tölunum og leit
      // út fyrir að allt væri í himnalagi. Þögul villa er verri en villan.
      if (error) throw new Error(tafla + ': ' + error.message);
      if (!data || !data.length) break;
      out = out.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    return out;
  }

  const heild = e => Object.values(e || {}).reduce((s, v) => s + (+v || 0), 0);
  const GJALD = /byrjunargjald|akstur|ferðakostn|sendingar|umsýslu|útkall/i;

  async function reikna() {
    const sb = SB(); if (!sb) throw new Error('Gagnagrunnstenging ekki tilbúin');

    const co = await allar('fyrirtaeki', 'id,nafn,kennitala,simi,farsimi,heimilisfang,er_i_thjonustu,customer_base_id',
      q => q.is('deleted_at', null));
    let ars = {};
    try {
      const { data } = await sb.from('app_settings').select('settings').eq('id', 1).maybeSingle();
      ars = (data && data.settings && data.settings.arsskodun_customers) || {};
    } catch (_) {}

    const sol = await allar('solur', 'customer_id,created_at,linur,is_credit');
    const rukkad = new Map();       // customer_id -> fjöldi tækja rukkaður í ár
    const medSolu = new Set();
    sol.forEach(s => {
      if (String(s.created_at).slice(0, 4) !== String(AR) || s.is_credit) return;
      medSolu.add(String(s.customer_id));
      let L = s.linur;
      if (typeof L === 'string') { try { L = JSON.parse(L); } catch (_) { L = []; } }
      if (!Array.isArray(L)) return;
      const q = L.filter(l => !GJALD.test(l.desc || '')).reduce((n, l) => n + (+l.qty || 0), 0);
      rukkad.set(String(s.customer_id), (rukkad.get(String(s.customer_id)) || 0) + q);
    });

    /* Reikningur getur verið SKRÁÐUR SEM SKJAL þótt engin sala sé í kerfinu
       (dkPlus/Drive-leiðin). Fyrsta útgáfan taldi aðeins sölur og fékk 161 —
       Node-mælingin sem taldi hvort tveggja fékk 30. Sá sem á reikning á skrá
       er rukkaður, sama hvaða leið hann fór. */
    let medReikning = new Set();
    try {
      const docs = await allar('customer_documents', 'customer_base_id,doc_type,year');
      docs.forEach(d => {
        if (d.doc_type === 'reikningur' && +d.year === AR && d.customer_base_id != null) {
          medReikning.add(String(d.customer_base_id));
        }
      });
    } catch (_) {}

    const man = new Date().getMonth() + 1;
    const H = { tom: [], enginAkstur: [], orukkad: [], skekkja: [] };

    co.forEach(c => {
      const a = ars[String(c.id)] || null;
      const taeki = a ? heild(a.equipment) : 0;
      const gogn = { id: c.id, nafn: c.nafn, kt: c.kennitala, simi: c.simi || c.farsimi, stadur: c.heimilisfang };
      const cb = c.customer_base_id != null ? String(c.customer_base_id) : null;

      // 1 · merkt í þjónustu en ekkert tæki skráð
      if (c.er_i_thjonustu && taeki === 0) H.tom.push(gogn);
      if (!a || taeki === 0) return;

      const m = +a.inspect_month || 0;
      const skodad = +a.last_year_inspected === AR;
      const ak = +a.akstur || 0;

      // 2 · komið á tíma og á engum aksturslista
      if (m > 0 && m <= man && !skodad && ak === 0) H.enginAkstur.push({ ...gogn, aukalega: 'mán ' + m });

      if (!skodad) return;
      // 3 · skoðað í ár en hvorki sala né reikningur
      if (!medSolu.has(String(c.id)) && !(cb && medReikning.has(cb))) {
        H.orukkad.push({ ...gogn, aukalega: taeki + ' tæki' });
      }
      // 4 · rukkuð tæki langt undir skráðum
      const r = rukkad.get(String(c.id)) || 0;
      if (r > 0 && r / taeki < 0.5) {
        H.skekkja.push({ ...gogn, aukalega: 'skrá ' + taeki + ' · rukkað ' + r });
      }
    });

    return H;
  }

  /* ── Útlit ─────────────────────────────────────────────────────────────── */
  function css() {
    if (document.getElementById('_st-css')) return;
    const s = document.createElement('style');
    s.id = '_st-css';
    const V = '#' + VIEW_ID + ' ';
    s.textContent = [
      V + '{padding:16px 14px 90px;max-width:1000px;margin:0 auto}',
      V + '.st-h1{font-size:22px;font-weight:800;color:var(--ink1,#11141c);margin:0 0 2px}',
      V + '.st-sub{font-size:12.5px;color:var(--ink3,#5d5a54);margin-bottom:16px}',
      V + '.st-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}',
      V + '.st-card{background:#fff;border:1px solid #e3e1dc;border-left:4px solid #c0392b;border-radius:4px;',
        'padding:13px 14px;cursor:pointer}',
      V + '.st-card.ok{border-left-color:#2e6b4a}',
      V + '.st-n{font-size:30px;font-weight:800;color:#11141c;line-height:1;font-variant-numeric:tabular-nums}',
      V + '.st-t{font-size:12.5px;font-weight:600;color:#16181c;margin-top:6px}',
      V + '.st-d{font-size:11.5px;color:#5d5a54;margin-top:3px;line-height:1.4}',
      V + '.st-list{margin-top:14px;background:#fff;border:1px solid #e3e1dc;border-radius:4px;overflow:hidden}',
      V + '.st-list h3{margin:0;padding:11px 13px;font-size:13px;background:#f0eeea;border-bottom:1px solid #e3e1dc}',
      V + '.st-row{display:flex;gap:10px;align-items:baseline;padding:8px 13px;border-bottom:1px solid #f1efec;font-size:13px}',
      V + '.st-row:last-child{border-bottom:0}',
      V + '.st-row b{flex:1;min-width:0;font-weight:600;color:#16181c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      V + '.st-row span{flex:0 0 auto;font-size:11.5px;color:#5d5a54;font-variant-numeric:tabular-nums}',
      V + '.st-note{margin-top:16px;font-size:12px;color:#5d5a54;line-height:1.55;border-left:2px solid #d9d5cf;padding-left:11px}',
      V + '.st-bid{padding:40px 0;text-align:center;color:#5d5a54}',
    ].join('');
    document.head.appendChild(s);
  }

  function viewEl() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = 'view';   // .view{display:none}; .view.active sýnir — ekki setja inline display
    document.body.appendChild(v);
    return v;
  }

  const KORT = [
    { key: 'tom', t: 'Í þjónustu — engin tæki skráð',
      d: 'Birtast aldrei í Ársskoðun, komast aldrei á aksturslista. Orsökin á bak við hinar þrjár tölurnar.' },
    { key: 'enginAkstur', t: 'Komin á tíma — enginn á leiðinni',
      d: 'Skoðunarmánuður liðinn, óskoðuð, og á engum aksturslista.' },
    { key: 'orukkad', t: 'Skoðuð í ár — engin rukkun',
      d: 'Vinnan er unnin en hvorki sala né reikningur sést á árinu.' },
    { key: 'skekkja', t: 'Rukkuð tæki langt undir skrá',
      d: 'Innan við helmingur skráðra tækja rukkaður. Annaðhvort er skráin of há eða reikningurinn of lágur.' },
  ];

  let _H = null, _opid = null;

  function teikna() {
    const v = viewEl();
    if (!_H) { v.innerHTML = '<div class="st-bid">Reikna stöðuna…</div>'; return; }
    const kort = KORT.map(k => {
      const n = _H[k.key].length;
      return '<div class="st-card' + (n === 0 ? ' ok' : '') + '" data-k="' + k.key + '">'
        + '<div class="st-n">' + n + '</div>'
        + '<div class="st-t">' + esc(k.t) + '</div>'
        + '<div class="st-d">' + esc(k.d) + '</div></div>';
    }).join('');

    let listi = '';
    if (_opid && _H[_opid] && _H[_opid].length) {
      const k = KORT.find(x => x.key === _opid);
      listi = '<div class="st-list"><h3>' + esc(k.t) + ' — ' + _H[_opid].length + '</h3>'
        + _H[_opid].slice(0, 300).map(r =>
            '<div class="st-row"><b>' + esc(r.nafn || '—') + '</b>'
            + '<span>' + esc(r.aukalega || '') + '</span>'
            + '<span>' + esc(r.kt || '') + '</span>'
            + '<span>' + esc(r.simi || '') + '</span></div>').join('')
        + '</div>';
    }

    v.innerHTML =
      '<h1 class="st-h1">Staðan</h1>'
      + '<div class="st-sub">Reiknað úr gögnunum núna — engin uppsetning, ekkert vistað. Smelltu á tölu til að sjá listann.</div>'
      + '<div class="st-grid">' + kort + '</div>'
      + listi
      + '<div class="st-note">Þetta breytir engu. Það sýnir aðeins hvað er ósamræmi í gögnunum.<br>'
      + 'Talan efst til vinstri er orsökin: sé tækið ekki skráð er ekki hægt að vita hvern á að '
      + 'heimsækja, hvað á að rukka, né hvað var í síðustu skýrslu.</div>';

    v.querySelectorAll('.st-card').forEach(c => c.addEventListener('click', () => {
      _opid = (_opid === c.dataset.k) ? null : c.dataset.k;
      teikna();
    }));
  }

  /* Bíða eftir DB.sb í stað þess að gefast upp. Bein slóð (/#stadan) kveikir
     sýnina ÁÐUR en DB.init() er búið, og fyrsta útgáfan skrifaði þá
     „Gagnagrunnstenging ekki tilbúin" og sat föst þannig — sem lítur út eins
     og síðan sé biluð þótt hún hefði virkað sekúndu síðar. */
  async function bidaEftirDB(ms) {
    const til = Date.now() + (ms || 20000);
    while (!SB() && Date.now() < til) await new Promise(r => setTimeout(r, 300));
    return !!SB();
  }

  let _reiknar = false;
  async function opna() {
    css();
    teikna();
    if (_H || _reiknar) return;
    _reiknar = true;
    try {
      if (!(await bidaEftirDB())) throw new Error('Gagnagrunnstenging kom aldrei — endurhlaða síðuna');
      _H = await reikna();
    }
    catch (e) {
      viewEl().innerHTML = '<div class="st-bid">Náði ekki að reikna: ' + esc(e.message || e) + '</div>';
      return;
    }
    finally { _reiknar = false; }
    teikna();
  }

  /* ── Tenging við nav ───────────────────────────────────────────────────── */
  function navTakki() {
    if (document.querySelector('[data-view="' + NAV_KEY + '"]')) return true;
    const sib = document.querySelector('[data-view="adstod"]')
             || document.querySelector('[data-view="arsskodun"]')
             || document.querySelector('[data-view]');
    if (!sib) return false;
    const b = sib.cloneNode(true);
    b.dataset.view = NAV_KEY;
    const sp = b.querySelector('span:not([class*="icon"]):not([class*="badge"])');
    if (sp) sp.textContent = '📊 Staðan';
    else for (const c of b.childNodes) if (c.nodeType === 3 && c.nodeValue.trim()) { c.nodeValue = ' 📊 Staðan'; break; }
    b.querySelectorAll('.count,.badge,[class*="badge"],[class*="count"]').forEach(n => n.remove());
    b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY);
    });
    sib.parentNode.insertBefore(b, sib);
    return true;
  }

  /* App.switchView þekkir aðeins sýnir sem eru í index.html. Þessi er búin til
     af pappa, svo hún verður að skrá sig sjálf — nákvæmlega eins og 239 gerir
     fyrir Aðstoðarmiðstöðina. Án þessa birtist tómur skjár þegar smellt er á
     nav-takkann (mælt 31.08: kortin fjögur voru til en .active vantaði). */
  function hookSwitch() {
    if (!window.App || !App.switchView) return false;
    if (App.__stadanPatched) return true;
    const orig = App.switchView.bind(App);
    App.switchView = function (k) {
      if (k === NAV_KEY) {
        document.querySelectorAll('.view').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
        const v = viewEl();
        v.style.display = 'block';
        v.classList.add('active');
        opna();
        try { history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
        return;
      }
      const me = document.getElementById(VIEW_ID);
      if (me) { me.style.display = 'none'; me.classList.remove('active'); }
      return orig(k);
    };
    App.__stadanPatched = true;
    return true;
  }

  function vakta() {
    navTakki();
    hookSwitch();
    // Bein slóð /#stadan á líka að virka, ekki bara nav-takkinn.
    try {
      if (location.hash.replace('#', '') === NAV_KEY) {
        const v = document.getElementById(VIEW_ID);
        if (!v || !v.classList.contains('active')) {
          if (window.App && App.switchView) App.switchView(NAV_KEY);
        }
      }
    } catch (_) {}
    const v = document.getElementById(VIEW_ID);
    if (v && v.classList.contains('active')) opna();
  }

  new MutationObserver(() => { clearTimeout(window.__stT); window.__stT = setTimeout(vakta, 300); })
    .observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta);
  else vakta();

  window.Stadan = { opna, reikna, version: 'v1' };
  console.log('[patch-345] stadan ready');
})();
/* === END STAÐAN === */
