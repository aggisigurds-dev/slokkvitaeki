/* 499-combo-yfirlit.js — VERKFERLIS-YFIRLIT Á ÞJÓNUSTUBORÐINU (07.11.2026)
 *
 * Agnar: „Kortleggja upplýsingareiti, pósta, kröfuyfirlit og allt setja í api verkferlis
 *         combo yfirlit inn á Agnar þjónustuborð sem ég get keyrt til að yfirfara."
 *         „Og verkefnalistana, samþykktir ofl."
 *
 * Ein lína per mæling: hvað hún er, talan, þakið, peningurinn, hvar hún er geymd og hvað
 * er gert við hana. Allt frá /api/combo-yfirlit — ENGIN mæling í þessari skrá. Ástæðan er
 * mæld: um leið og viðmótið reiknar sína eigin tölu stangast hún á við borðið innan dags.
 *
 * ÞRJÁR GILDRUR SEM ÞESSI SKRÁ ÞARF AÐ FORÐAST (allar skráðar í CLAUDE.md):
 *
 *  1. SKUGGARÓTIN. Borðið (368) er inni í `#view-bord`.shadowRoot og teiknar sig með
 *     innerHTML. Hnútur sem er settur þar inn hverfur við næstu teikningu. Þess vegna er
 *     hér vakt sem SETUR HANN AFTUR — en hún snertir DOM aðeins þegar hnúturinn er
 *     raunverulega farinn (`if (rot.firstChild === minn) return;`). Vakt sem færir hnút
 *     „til að vera viss" fer í reiptog við þann sem teiknar og síðan kemst aldrei í kyrrstöðu
 *     (mælt 23.09.2026: 11 færslur á 6 sekúndum).
 *  2. HOPP. Spjaldið hefur SÖMU hæð tómt og fullt (--yf-min), svo svarið ýtir borðinu ekki
 *     niður þegar það lendir. Talnalínurnar fá staðgengil í sömu stærð og svarið.
 *  3. EITT GILDI Á ALLAR VÉLARNAR. Samanbrotið er geymt með Vidmot (472) → AppSettings á
 *     þjóninum, ekki localStorage (regla Agnars 15.10.2026). Skrifað aðeins við smell.
 *
 * Takkinn KEYRIR; hann sendir ekkert og breytir engum gögnum. `?skrifa=1` (sem uppfærir
 * málið á borðinu) er AÐEINS í skipanalínunni og cron — viðmótið á ekki að skrifa mál
 * við hverja opnun.
 */
(function () {
  'use strict';
  if (window.__comboYfirlit499) return;
  window.__comboYfirlit499 = true;

  var VIEW_ID = 'view-bord';
  var ID = 'yf499';
  var LYKILL = 'bord.comboYfirlit.opid';
  var MONO = '"IBM Plex Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,sans-serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';

  var FLOKKAHEITI = {
    krofur: 'Kröfuyfirlit', postur: 'Póstur', upplysingar: 'Upplýsingareitir',
    skodanir: 'Skoðanir', verkefni: 'Verkefnalistar', samthykki: 'Samþykktir',
    tengingar: 'Tengingar',
  };

  var S = { svar: null, sakir: false, villa: null };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Íslenskt snið reiknað sjálft — toLocaleString('is-IS') fellur í en-US á sumum vélum
  // og skrifar þá 2,494,571 (minni: feedback_tolocalestring_lygur).
  function kr(n) {
    var v = Math.round(Number(n) || 0), neg = v < 0; v = Math.abs(v);
    return (neg ? '-' : '') + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';
  }
  function opid() {
    try { return window.Vidmot ? Vidmot.lesa(LYKILL, true) !== false : true; } catch (_) { return true; }
  }
  function setjaOpid(v) { try { if (window.Vidmot) Vidmot.setja(LYKILL, !!v); } catch (_) {} }

  function stilar() {
    return '#' + ID + '{--yf-min:132px;font-family:' + SANS + ';margin:0 0 14px;border:1px solid #2a2d33;'
      + 'border-radius:10px;overflow:hidden;background:#101114;box-shadow:0 2px 10px rgba(0,0,0,.35)}'
      + '#' + ID + ' .yf-haus{background:' + METAL + ';color:#f2f4f7;padding:10px 14px;display:flex;'
      + 'align-items:center;gap:12px;position:relative;cursor:pointer;user-select:none}'
      + '#' + ID + ' .yf-haus::before,#' + ID + ' .yf-haus::after{content:"";position:absolute;top:50%;'
      + 'width:6px;height:6px;margin-top:-3px;border-radius:50%;'
      + 'background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);'
      + 'box-shadow:0 1px 1px rgba(0,0,0,.7)}'
      + '#' + ID + ' .yf-haus::before{left:6px}#' + ID + ' .yf-haus::after{right:6px}'
      + '#' + ID + ' .yf-titill{font-family:' + MONO + ';font-weight:600;font-size:13px;letter-spacing:.04em;'
      + 'text-transform:uppercase;flex:1;min-width:0;padding-left:8px}'
      + '#' + ID + ' .yf-stada{font-family:' + MONO + ';font-size:12px;color:#c3c8d0;white-space:nowrap}'
      /* App-hamurinn (261 + 314) stimplar ALLA takka í ~50px með !important. Fjögurra-auðkenna
         keðjan er húsreglan til að vinna þá (slokkvitaeki-layout §10.3) — án hennar þenst
         takkinn út og hausinn verður tvöfaldur á símanum. */
      + '#' + ID + ' .yf-keyra:not(#_yA):not(#_yB):not(#_yC):not(#_yD){background:' + SILVER + ';'
      + 'color:#14161a;border:1px solid #9aa2ad;border-radius:6px;padding:6px 14px !important;'
      + 'font-family:' + MONO + ' !important;font-size:12px !important;font-weight:600;'
      + 'height:auto !important;min-height:0 !important;min-width:0 !important;width:auto !important;'
      + 'margin:0 !important;cursor:pointer;white-space:nowrap}'
      + '#' + ID + ' .yf-keyra:disabled{opacity:.55;cursor:default}'
      + '#' + ID + ' .yf-bol{min-height:var(--yf-min);padding:12px 14px;background:#fbfbfc;color:#14161a;'
      + 'box-sizing:border-box}'
      + '#' + ID + '.lokad .yf-bol{display:none}'
      + '#' + ID + ' .yf-flokkur{font-family:' + MONO + ';font-size:11px;letter-spacing:.08em;'
      + 'text-transform:uppercase;color:#5c6470;margin:10px 0 4px;border-bottom:1px solid #e4e6ea;padding-bottom:3px}'
      + '#' + ID + ' .yf-flokkur:first-child{margin-top:0}'
      + '#' + ID + ' .yf-lina{display:flex;gap:10px;align-items:baseline;padding:3px 0;font-size:13px}'
      + '#' + ID + ' .yf-m{font-family:' + MONO + ';width:14px;flex:none;font-weight:700}'
      + '#' + ID + ' .yf-m.ok{color:#1a7f4b}#' + ID + ' .yf-m.ny{color:#C93C1D}#' + ID + ' .yf-m.om{color:#b45309}'
      + '#' + ID + ' .yf-h{flex:1;min-width:0}'
      + '#' + ID + ' .yf-t{font-family:' + MONO + ';font-weight:600;white-space:nowrap}'
      + '#' + ID + ' .yf-p{font-family:' + MONO + ';color:#404550;white-space:nowrap}'
      + '#' + ID + ' .yf-nanar{font-size:12px;color:#525b6b;margin:2px 0 0 24px;display:none}'
      + '#' + ID + ' .yf-lina.opin+.yf-nanar{display:block}'
      + '#' + ID + ' .yf-dag{font-size:12px;color:#404550;padding:2px 0}'
      + '#' + ID + ' .yf-grind div{height:13px;border-radius:3px;margin:6px 0;'
      + 'background:linear-gradient(90deg,#eceef1,#f6f7f8,#eceef1)}'
      + '#' + ID + ' .yf-villa{color:#C93C1D;font-size:13px}'
      + '#' + ID + ' small{color:#525b6b}';
  }

  function grind() {
    /* Staðgengillinn er MÆLDUR til að passa við --yf-min (132px): fjórar línur á 13px
       + 6px bil = 124px innan 24px fóðrunar. Fyrsta útgáfan hafði sjö línur og þá hrökk
       spjaldið úr 213px í 182px þegar svarið lenti — 31px hopp sem Agnar hefði séð.
       Vöxtur upp í fullt svar er ekki hopp: hann kemur af því að ÞÚ ýttir á Keyra. */
    var d = '';
    for (var i = 0; i < 4; i++) d += '<div style="width:' + (62 + (i % 3) * 12) + '%"></div>';
    return '<div class="yf-grind">' + d + '</div>';
  }

  function linaHtml(l) {
    if (l.merki === 'OMAELT') {
      return '<div class="yf-lina" data-yf-l="' + esc(l.lykill) + '">'
        + '<span class="yf-m om">?</span><span class="yf-h">' + esc(l.heiti) + '</span>'
        + '<span class="yf-t">ÓMÆLT</span></div>'
        + '<div class="yf-nanar">Þögn er ekki núll — talan var ekki mæld'
        + (l.villa ? ' (' + esc(l.villa) + ')' : '') + '. ' + esc(l.heimild) + '</div>';
    }
    var ny = l.nytt > 0;
    return '<div class="yf-lina" data-yf-l="' + esc(l.lykill) + '">'
      + '<span class="yf-m ' + (ny ? 'ny' : 'ok') + '">' + (ny ? '✗' : '✓') + '</span>'
      + '<span class="yf-h">' + esc(l.heiti) + (ny ? ' <small>' + l.nytt + ' ný</small>' : '') + '</span>'
      + (l.peningur ? '<span class="yf-p">' + esc(kr(l.peningur))
          + (l.peningur_allt ? '' : ' <small>af ' + l.peningur_af + '</small>') + '</span>' : '')
      + '<span class="yf-t">' + l.tala + '<small>/' + l.thak + '</small></span></div>'
      + '<div class="yf-nanar"><b>Heimild:</b> ' + esc(l.heimild) + '<br><b>Aðgerð:</b> ' + esc(l.adgerd) + '</div>';
  }

  function bolHtml() {
    if (S.villa) {
      return '<div class="yf-villa">Yfirlitið svaraði ekki: ' + esc(S.villa) + '</div>'
        + '<div style="margin-top:6px"><small>Það er ekki það sama og „ekkert að" — '
        + 'engin tala hér er mæld fyrr en keyrslan gengur.</small></div>';
    }
    if (S.sakir || !S.svar) return grind();
    var j = S.svar, s = j.samantekt || {}, ut = '', fl = null;
    (j.linur || []).forEach(function (l) {
      if (l.flokkur !== fl) { fl = l.flokkur; ut += '<div class="yf-flokkur">' + esc(FLOKKAHEITI[fl] || fl) + '</div>'; }
      ut += linaHtml(l);
    });
    var d = j.dagskra || {};
    ut += '<div class="yf-flokkur">Dagskrá næstu daga</div>';
    if (d.merki !== 'MAELT') {
      ut += '<div class="yf-dag"><b>ÓMÆLD</b> — ' + esc(d.skyring || '') + '</div>';
    } else if (!(d.naestu_dagar || []).length) {
      ut += '<div class="yf-dag">Ekkert bókað í dagnótum þessa daga.</div>';
    } else {
      d.naestu_dagar.forEach(function (x) {
        ut += '<div class="yf-dag"><b>' + esc(x.dags) + '</b> · ' + esc(x.hver) + ' — '
          + esc(String(x.texti).replace(/\s*\n\s*/g, ' / ')) + '</div>';
      });
      ut += '<div class="yf-dag"><small>Staður á dagskrá er ekki gleymdur.</small></div>';
    }
    if ((d.checklistar_opnir || []).length) {
      ut += '<div class="yf-dag"><small>Opnir checklistar: ' + d.checklistar_opnir.length + ' atriði ('
        + d.checklistar_opnir.filter(function (c) { return c.stjarna; }).length + ' stjörnumerkt)</small></div>';
    }
    ut += '<div style="margin-top:10px"><small>' + s.maelt + ' mældar · ' + s.nytt_fra_grunnlinu
      + ' yfir grunnlínu · ' + s.omaelt + ' ómældar. Þak = staðan 07.11.2026; rautt þýðir '
      + '„þetta hækkaði", ekki „gamla skuldin stendur". Smelltu á línu til að sjá heimild og aðgerð.'
      + '</small></div>';
    return ut;
  }

  function stadaText() {
    if (S.sakir) return 'mæli…';
    if (S.villa) return 'svaraði ekki';
    if (!S.svar) return 'ekki keyrt';
    var s = S.svar.samantekt || {};
    return s.nytt_fra_grunnlinu + ' nýtt · ' + s.omaelt + ' ómæld · '
      + String(S.svar.maelt_kl || '').slice(11, 16);
  }

  function teikna(el) {
    el.className = opid() ? '' : 'lokad';
    el.innerHTML =
      '<div class="yf-haus" data-yf-brjota>'
      + '<span class="yf-titill">Verkferlis-yfirlit</span>'
      + '<span class="yf-stada">' + esc(stadaText()) + '</span>'
      + '<button class="yf-keyra" data-yf-keyra' + (S.sakir ? ' disabled' : '') + '>'
      + (S.sakir ? 'Mæli…' : 'Keyra') + '</button>'
      + '</div>'
      + '<div class="yf-bol">' + bolHtml() + '</div>';
  }

  async function keyra(el) {
    if (S.sakir) return;
    S.sakir = true; S.villa = null; teikna(el);
    try {
      var r = await fetch('/api/combo-yfirlit?radir=5', { headers: { accept: 'application/json' } });
      var j = await r.json().catch(function () { return null; });
      if (!r.ok || !j || !j.ok) {
        // Villuboð geta verið hlutur, ekki strengur — `new Error(hlutur)` varð „[object Object]"
        // í fyrstu keyrslu. Villutexti sem segir ekkert er sama og þögn.
        var v = j && j.error;
        if (v && typeof v === 'object') v = v.message || JSON.stringify(v);
        throw new Error(v || ('HTTP ' + r.status + ' frá /api/combo-yfirlit'));
      }
      S.svar = j;
    } catch (e) {
      S.villa = String((e && e.message) || e);
    } finally {
      S.sakir = false; teikna(el);
    }
  }

  function rotin() {
    var v = document.getElementById(VIEW_ID);
    return v && v.shadowRoot ? v.shadowRoot : null;
  }

  function festa() {
    var rot = rotin();
    if (!rot) return false;
    if (!rot.getElementById || !rot.querySelector) return false;
    var minn = rot.querySelector('#' + ID);
    // Snertu DOM AÐEINS þegar hnúturinn er raunverulega farinn eða á röngum stað.
    if (minn && rot.firstElementChild === minn) return true;

    if (!rot.querySelector('#' + ID + '-st')) {
      var st = document.createElement('style');
      st.id = ID + '-st';
      st.textContent = stilar();
      rot.appendChild(st);
    }
    if (!minn) {
      minn = document.createElement('section');
      minn.id = ID;
      teikna(minn);
      minn.addEventListener('click', function (e) {
        var k = e.target.closest ? e.target.closest('[data-yf-keyra]') : null;
        if (k) { e.stopPropagation(); keyra(minn); return; }
        var h = e.target.closest ? e.target.closest('[data-yf-brjota]') : null;
        if (h) { setjaOpid(!opid()); minn.className = opid() ? '' : 'lokad'; return; }
        var l = e.target.closest ? e.target.closest('.yf-lina') : null;
        if (l) l.classList.toggle('opin');
      });
    }
    rot.insertBefore(minn, rot.firstChild);
    return true;
  }

  function vakta() {
    var v = document.getElementById(VIEW_ID);
    if (!v || !v.shadowRoot) return false;
    if (v.__yf499vakt) return true;
    v.__yf499vakt = true;
    // childList ÁN subtree: borðið teiknar sig með innerHTML á rótinni, svo bein
    // barnabreyting er það eina sem getur fjarlægt spjaldið. Vaktin hleypur ekki á
    // hverri innri uppfærslu og vekur því ekki sjálfa sig.
    new MutationObserver(function () { festa(); }).observe(v.shadowRoot, { childList: true });
    return true;
  }

  function reyna() {
    if (festa()) { vakta(); return true; }
    return false;
  }

  if (!reyna()) {
    // Borðið verður til þegar flett er á það; bíddu þess í staðinn fyrir fasta lykkju.
    var o = new MutationObserver(function () { if (reyna()) o.disconnect(); });
    o.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { o.disconnect(); }, 120000);
  }

  window.ComboYfirlit = {
    keyra: function () { var rot = rotin(); var el = rot && rot.querySelector('#' + ID); if (el) keyra(el); },
    svar: function () { return S.svar; },
    version: '499a',
  };
})();
