/* === BORÐ PER STARFSMANN v1 ===
 *
 * Agnar 02.09.2026: „put a bigger name box beside of Viðskiptavinavefir.. that
 * we can choose the staffmember. so each staff can have its own board... for
 * Dagskrá, Skipulagsborð, and the joblist below… but the staff name will not
 * change to allir, it should be default remember what staff name was last time
 * used in that computer." Og: „create new name Afgreiðsla that we will keep in
 * afgreiðsla computer for everybody to see."
 *
 * TVENNS KONAR MINNI, OG ÞAÐ ER KJARNI HÖNNUNARINNAR:
 *   · HVER starfsmaðurinn er   → localStorage, EITT gildi per TÖLVU.
 *     Afgreiðslutölvan stendur alltaf á „Afgreiðsla", Agnars vél á „Agnar".
 *     Það er stillingin sem má ALDREI stökkva í „allir" við endurhleðslu —
 *     þess vegna localStorage en ekki app_settings.
 *   · HVAÐ hann á                → app_settings, samstillt milli allra véla.
 *     Sami starfsmaður sér sitt borð hvar sem hann skráir sig inn.
 *
 * Væru bæði geymd á sama stað fengist annaðhvort borð sem fylgir ekki manninum
 * milli véla, eða vél sem skiptir um mann þegar einhver annar velur sig.
 *
 * LYKLAR (báðir undir sínum eigin app_settings-lykli, sbr. #85 atómísku
 * vistunina — tveir starfsmenn geta vistað samtímis án þess að trufla hvor
 * annan):
 *     bord_starfsmenn                       → ['Agnar','Afgreiðsla', …]
 *     vikudagskra.by_staff.<nafn>.jobs      → dagskrá hvers og eins
 *     skipulagsbord.by_staff.<nafn>.cards   → spjöld hvers og eins
 *
 * FLUTNINGUR: það sem fyrir var í `vikudagskra.jobs` og `skipulagsbord.cards`
 * flyst á „Agnar" við fyrstu keyrslu — hann átti þau. Gömlu lyklarnir eru
 * SKILDIR EFTIR ósnertir sem afrit; ekkert er eytt.
 *
 * API: window.BordStarfsmadur = { get, set, list, onChange, bordLykill }
 */
(() => {
  if (window.__bordStarfsmennInstalled) return;
  window.__bordStarfsmennInstalled = true;

  const LS_KEY = 'vb_starfsmadur';
  // Nofnin sem eru THEGAR i notkun i thjonustubeidni.assigned_to (maelt
  // 02.09.2026: Charlize 66, Agnar 49, Bjarndis 3, Elias 2, Anni 1) plus
  // Afgreidsla sem er stadur en ekki manneskja.
  const SJALFGEFNIR = ['Agnar', 'Afgreiðsla', 'Charlize', 'Bjarndís', 'Anni', 'Elías'];
  const listeners = [];

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ── hver er við tölvuna ────────────────────────────────────────────────────
  function get() {
    let v = null;
    try { v = localStorage.getItem(LS_KEY); } catch (_) {}
    if (v && String(v).trim()) return String(v).trim();
    // Enginn valinn enn á þessari vél → fyrsta nafnið, ALDREI „allir".
    return list()[0] || 'Agnar';
  }
  function set(nafn) {
    const n = String(nafn || '').trim();
    if (!n) return;
    try { localStorage.setItem(LS_KEY, n); } catch (_) {}
    listeners.forEach(fn => { try { fn(n); } catch (_) {} });
    render();
  }

  // ── hverjir eru til (samstillt) ────────────────────────────────────────────
  function list() {
    const v = (window.AppSettings && AppSettings.path) ? AppSettings.path('bord_starfsmenn') : null;
    const arr = Array.isArray(v) ? v.map(x => String(x || '').trim()).filter(Boolean) : [];
    return arr.length ? arr : SJALFGEFNIR.slice();
  }
  async function baetaVid(nafn) {
    const n = String(nafn || '').trim();
    if (!n) return;
    const nu = list();
    if (nu.some(x => x.toLowerCase() === n.toLowerCase())) { set(n); return; }
    const next = nu.concat([n]);
    if (window.AppSettings && AppSettings.save) await AppSettings.save({ bord_starfsmenn: next });
    set(n);
  }

  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }

  // Lykilslóð borðs fyrir NÚVERANDI starfsmann. Borðin tvö kalla á þetta svo
  // slóðin sé skilgreind á EINUM stað.
  function bordLykill(grunnur) { return grunnur + '.by_staff.' + get(); }

  // ── flutningur á gömlu gögnunum yfir á Agnar (einu sinni) ─────────────────
  let _fluttThegar = false;
  async function flytjaGomul() {
    if (_fluttThegar) return;
    if (!window.AppSettings || !AppSettings.isLoaded || !AppSettings.isLoaded()) return;
    _fluttThegar = true;
    const P = k => { try { return AppSettings.path(k); } catch (_) { return null; } };
    const patch = {};
    const gomulVerk = P('vikudagskra.jobs');
    const nyVerk = P('vikudagskra.by_staff.Agnar.jobs');
    if (Array.isArray(gomulVerk) && gomulVerk.length && !Array.isArray(nyVerk)) {
      patch.vikudagskra = { by_staff: { Agnar: { jobs: gomulVerk } } };
    }
    const gomulSpjold = P('skipulagsbord.cards');
    const nySpjold = P('skipulagsbord.by_staff.Agnar.cards');
    if (Array.isArray(gomulSpjold) && gomulSpjold.length && !Array.isArray(nySpjold)) {
      patch.skipulagsbord = { by_staff: { Agnar: { cards: gomulSpjold } } };
    }
    if (!Object.keys(patch).length) return;
    // Gömlu lyklarnir eru EKKI hreinsaðir — þeir standa sem afrit ef eitthvað
    // fer úrskeiðis í flutningnum.
    const ok = await AppSettings.save(patch);
    if (ok) {
      console.log('[bord-starfsmenn] gömul borð flutt á Agnar');
      listeners.forEach(fn => { try { fn(get()); } catch (_) {} });
    }
  }

  // ── veljarinn ─────────────────────────────────────────────────────────────
  const SLOT = 'vb-starfsmadur-slot';
  function render() {
    const slot = document.getElementById(SLOT);
    if (!slot) return;
    const nu = get(), nofn = list();
    const val = nofn.map(n =>
      `<option value="${esc(n)}"${n === nu ? ' selected' : ''}>${esc(n)}</option>`).join('');
    slot.innerHTML =
      '<label style="display:inline-flex;align-items:center;gap:9px;height:42px;padding:0 8px 0 14px;' +
        'border-radius:12px;border:1px solid rgba(255,255,255,.22);' +
        'background:linear-gradient(145deg,#22262e 0%,#151920 55%,#0e1116 100%);' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.09)">' +
        '<span style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;' +
          'color:rgba(255,255,255,.45);white-space:nowrap">Borð</span>' +
        '<select id="vb-starfsmadur" title="Hvers borð er sýnt — munað á þessari tölvu" ' +
          'style="height:32px;min-width:150px;border:0;background:transparent;color:#fff;' +
          'font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;outline:none">' +
          val +
          '<option value="__nyr">＋ nýtt nafn…</option>' +
        '</select>' +
      '</label>';
    const sel = document.getElementById('vb-starfsmadur');
    if (sel) sel.addEventListener('change', ev => {
      const v = ev.target.value;
      if (v === '__nyr') {
        const n = window.prompt('Nafn á nýju borði:');
        if (n && n.trim()) baetaVid(n.trim()); else render();
        return;
      }
      set(v);
    });
  }

  // Verkborðið teiknar sig upp á nýtt við hverja síu; reiturinn þarf því að
  // komast inn aftur án þess að #231 viti af okkur.
  function setja() {
    const hopur = document.querySelector('#view-verkbord [data-act="gattadmin"]');
    if (!hopur || !hopur.parentElement) return;
    if (document.getElementById(SLOT)) { render(); return; }
    const d = document.createElement('div');
    d.id = SLOT;
    hopur.parentElement.insertBefore(d, hopur);
    render();
  }

  const mo = new MutationObserver(() => { setja(); });
  function ræsa() {
    const v = document.getElementById('view-verkbord');
    if (!v) { setTimeout(ræsa, 600); return; }
    mo.observe(v, { childList: true, subtree: true });
    setja();
    flytjaGomul();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ræsa, { once: true });
  else ræsa();

  if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => { flytjaGomul(); render(); });

  window.BordStarfsmadur = { get, set, list, onChange, bordLykill, baetaVid };
})();
