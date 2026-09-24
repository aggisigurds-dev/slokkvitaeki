/* === ÞÉTT FYRIRTÆKJASPJALD (411) — 24.09.2026 ===
 *
 * Agnar 24.09 (skjámynd af Ferðamálastofu): „Geturðu sent mér aðra meiri compact útgáfu — þessi er að sýna óþarflega
 * mikið af engum gögnum." Spjald E á Design-striganum samþykkt („Já flott svona"). Svæðið undir borðanum fer úr ~490 px
 * í ~205 px án þess að nokkur reitur tapist:
 *
 *   1. Staðreyndalínurnar (staður · netfang · sími …) flæða á EINA línu í stað þriggja fullbreiðra; fyrirtækjaskráin
 *      er ein dauf lína.
 *   2. Tómu reitirnir (Hús, Einingar, Tæki, Aðkoma, Tengiliður, Aðkoma nánar, Kóði, Afsláttur) eru ekki lengur átta
 *      hvítir kassar heldur EIN strikuð „Óskráð"-lína með nöfnunum og takkanum „+ Fleiri upplýsingar" (363 á takkann
 *      og opið/lokað-stöðuna, bupp_opid — hér er hann aðeins færður inn í línuna og sýndur á tölvu). Reitir með gildi
 *      sitja sem þéttar 32 px línur við hlið hver annarrar; opið sýnir tómu reitina tvo í röð.
 *   3. Athugasemdin er EIN lína sem stækkar sjálf með textanum upp í 5 línur; lengri texti fær „Sýna allt / Minna".
 *      (Agnar: „bætir við sjálf upp í 5 línur, síðan þá bara expand and collapse".)
 *   4. Loftmyndin lækkar í 150 px.
 *
 * Reglur: engin tenging/takki má breytast — 363 teiknar reitina, hér er aðeins CSS + tvær litlar umraðanir (strikaða
 * línan og takkinn inn í hana) sem eru endurteknar í hverju tifi því 363 skrifar hólfið upp á nýtt. Aðeins tölva í
 * Brunastáli (sama gildissvið og 402/404): síminn heldur röðun 363/338.
 */
(function () {
  'use strict';
  if (window.__thett411) return;
  window.__thett411 = true;

  var S = 'html[data-thm-preset="brunastal"]:not([data-viewmode="mobile"]):not(.slokk-phone-dev) body:not(.appmode) #companies-main:has(.co-banner) ';
  var F = ':not(#_p411a):not(#_p411b):not(#_p411c):not(#_p411d):not(#_p411e):not(#_p411f)';   // sex gervi-auðkenni: yfir F í 402 (fimm)
  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var LINA_H = 20, MAX_LINUR = 5;

  function r(sel, css) { return sel.split(',').map(function (s) { var m = s.trim().match(/^(.*?)(::?(?:before|after))$/); return S + (m ? m[1] + F + m[2] : s.trim() + F); }).join(',') + '{' + css + '}'; }   // gervi-auðkennin á undan ::before (annars ógild regla)
  var css = [
    // 1) staðreyndir á eina línu
    r('.co-banner-facts', 'display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;gap:6px!important;align-items:stretch!important'),
    r('.co-banner-facts > span', 'flex:0 1 auto!important;min-height:32px!important;min-width:0!important;max-width:100%!important;margin:0!important'),
    r('.co-banner-facts > span:has(a[href*="maps"]),.co-banner-facts > span:first-child', 'flex:1 1 auto!important'),
    r('.b405-facts .co-banner-facts > span::before', 'width:auto!important;margin-right:2px;font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.08em;text-transform:uppercase;color:#3a4250!important'),
    r('.co-banner-skra', 'min-height:30px!important;font-size:12px!important;margin:0!important'),
    r('.b405-facts .co-banner-skra::before', 'width:auto!important;margin-right:6px;font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.08em;text-transform:uppercase;color:#3a4250!important'),
    r('.b405-facts .co-banner-skra', 'color:#6b7483!important'),
    r('.b405-facts', 'gap:6px!important'),
    // 4) loftmynd lægri
    r('.co-mynd-flis', 'height:150px!important;min-height:150px!important;max-height:150px!important'),
    r('.co-mynd-flis img,.co-mynd-flis canvas', 'height:100%!important;object-fit:cover!important'),
    // 2b) Agnar 24.09 („move 2 boxes under the 2 boxes on the right"): reitasvæðið í hægri dálkinn, undir loftmynd og
    //     tökkunum tveimur — athugasemdin fyllir vinstri dálkinn á móti.
    // 24.09 14:11 (Agnar: „to empty space on the left now … have it even, afsláttur box only 50% wide and teikningar"):
    // reitirnir vinstra megin undir athugasemdinni, tveir í röð; loftmynd + takkar hægra megin.
    r('.co-banner', 'grid-template-areas:"id id" "facts mynd" "note mynd" "bupp knappar"!important;grid-template-rows:auto auto auto 1fr!important;align-items:start!important'),
    r('.co-bupp', 'grid-area:bupp!important;margin:0 0 0 12px!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;align-items:stretch!important'),
    r('.co-bupp ._bupp-lina', 'min-width:0!important'),
    r('.co-bupp .b411-oskrad', 'grid-column:1 / -1!important'),
    r('.b405-knappar', 'grid-area:knappar!important;margin:0 12px 0 0!important;flex-wrap:wrap!important;align-self:start!important'),
    r('.co-mynd', 'align-self:stretch!important'),
    r('.co-banner-right', 'grid-area:note!important;align-self:start!important'),
    // 2) reitirnir: þéttar línur hlið við hlið, tómir faldir meðan lokað er
    r('.co-bupp ._bupp-lina', 'min-height:32px!important;padding:3px 10px!important;gap:8px!important'),
    r('.co-bupp._bupp-thjappad ._bupp-lina._bupp-tomt', 'display:none!important'),
    r('.co-bupp ._bupp-lina._bupp-tomt', 'background:transparent!important;box-shadow:inset 0 0 0 1px rgba(20,24,34,.16)!important;outline:1px dashed rgba(20,24,34,.22);outline-offset:-1px'),
    r('.co-bupp ._bupp-innri', 'justify-content:flex-start!important'),
    r('.co-bupp .b411-oskrad', 'flex:1 1 100%!important;display:flex!important;align-items:center;gap:8px;min-height:32px;padding:0 6px 0 10px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.16);outline:1px dashed rgba(20,24,34,.26);outline-offset:-1px;font-size:12.5px;color:#525b6b;min-width:0'),
    r('.co-bupp .b411-oskrad > b', 'font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#3a4250;flex:none'),
    r('.co-bupp .b411-oskrad > span', 'flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'),
    r('.co-bupp:not(._bupp-thjappad) .b411-oskrad > span', 'opacity:.55'),
    r('.co-bupp .b411-oskrad ._bupp-vixl', 'display:inline-flex!important;align-items:center;height:26px!important;padding:0 10px!important;margin:0!important;border:1px dashed rgba(20,24,34,.35)!important;border-radius:7px!important;background:transparent!important;box-shadow:none!important;color:#3a4250!important;font-size:12px!important;font-weight:600!important;white-space:nowrap;flex:none'),
    r('.co-bupp > ._bupp-vixl', 'display:none!important'),   // takkinn utan línunnar (augnablikið áður en hann er færður)
    // 3) athugasemdin: ein lína sem vex
    r('.co-banner-right', 'gap:4px!important'),
    r('.co-banner-right .co-banner-note', 'flex:none!important;min-height:36px!important;height:36px;line-height:' + LINA_H + 'px!important;padding:7px 10px!important;resize:none!important;overflow:hidden!important;box-sizing:border-box!important;transition:none!important'),
    r('.co-banner-right .co-banner-note.b411-opin', 'overflow:auto!important'),
    r('.co-banner-right .b411-meira', 'align-self:flex-end;height:22px;padding:0 8px;border:0;border-radius:5px;background:transparent;color:#525b6b;font-family:' + MONO + ';font-size:11px;font-weight:700;cursor:pointer;display:none'),
    r('.co-banner-right .b411-meira.syna', 'display:inline-flex;align-items:center;gap:4px'),
    // 5) Samskipti þétt: haus 56 px, tölur sem plötur á einni línu, nýjasta uppfærslan ein lína; „Meira" opnar allt
    // 24.09.2026: hýsillinn (286) stendur tómur í ~1 s áður en kortið kemur (159 px) — frátekið pláss svo Úttektin hoppi ekki niður
    r('._samskipti-host', 'min-height:159px'),
    r('.card._samskipti-card:not(.b411-opid) ', 'padding:0 0 8px!important;gap:6px!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-head', 'padding:5px 12px!important;min-height:0!important;display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;gap:14px!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-head ._skx-acts', 'margin-left:auto!important;display:flex!important;flex-wrap:nowrap!important;flex:none!important;gap:6px!important;align-items:center!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-head ._skx-acts button', 'white-space:nowrap!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-head ._skx-title', 'white-space:nowrap!important;flex:none!important;line-height:1!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-head .b405-talning', 'flex:none!important;margin:0!important;order:1!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-head ._skx-title', 'order:0!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-head ._skx-acts', 'order:2!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-head ._skx-title', 'font-size:11px!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-head .b405-talning', 'gap:6px!important;align-items:baseline!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-head .b405-talning .tala', 'font-size:18px!important;line-height:1!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-head .b405-talning .tlabel', 'font-size:12px!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-head ._skx-acts button', 'height:28px!important;padding:0 10px!important;font-size:12px!important'),
    r('.card._samskipti-card:not(.b411-opid) ._smx-strip', 'min-height:26px!important;padding:0 14px!important;margin:0!important'),
    r('.card._samskipti-card:not(.b411-opid) ._smx-strip ._smx-imp', 'height:26px!important;padding:0 8px!important;font-size:11.5px!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-tiles', 'display:flex!important;flex-wrap:wrap!important;gap:6px!important;padding:0 14px!important;margin:0!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-tile', 'flex:0 1 auto!important;display:flex!important;align-items:baseline!important;gap:6px!important;min-height:36px!important;height:auto!important;padding:4px 12px!important;margin:0!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-tile > b', 'font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:#525b6b!important;margin:0!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-tile > span', 'font-size:13.5px!important;font-weight:600!important;margin:0!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-tile > small', 'font-size:11.5px!important;margin:0!important;white-space:nowrap!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-lbl:not(._ssk-full ._skx-lbl)', 'display:none!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-nyjast', 'margin:0 14px!important;padding:0!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-nyjast ._skx-rod-inni', 'display:flex!important;flex-wrap:nowrap!important;align-items:center!important;gap:10px!important;min-height:38px!important;padding:0 12px!important;overflow:hidden!important;font-size:13.5px!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-nyjast ._skx-meta', 'flex:none!important;white-space:nowrap!important;margin:0!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-nyjast ._skx-subj', 'flex:0 1 auto!important;min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;margin:0!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-nyjast ._skx-txt', 'flex:1 1 0!important;min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;margin:0!important;max-height:none!important;font-size:12.5px!important;color:#525b6b!important'),
    r('.card._samskipti-card:not(.b411-opid) ._skx-nyjast ._ssk-body', 'display:none!important'),
    r('.card._samskipti-card:not(.b411-opid) ._ssk-note,.card._samskipti-card:not(.b411-opid) ._skx-pts', 'display:none!important'),
    r('.card._samskipti-card .b411-samsk-meira', 'height:28px;padding:0 10px;border-radius:7px;border:1px dashed rgba(255,255,255,.35);background:transparent;color:#d5dbe6;font-family:' + MONO + ';font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px')
  ].join('\n');
  var st = document.createElement('style'); st.id = 'thett-411'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  function scope() {
    var h = document.documentElement;
    return h.getAttribute('data-thm-preset') === 'brunastal' && h.getAttribute('data-viewmode') !== 'mobile' && !h.classList.contains('slokk-phone-dev') && !(document.body && document.body.classList.contains('appmode'));
  }
  function txt(e) { return String((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }

  // ── 2) strikaða „Óskráð"-línan — endurgerð í hverju tifi (363 skrifar hólfið upp á nýtt) ──
  function oskrad(box) {
    var tom = Array.prototype.slice.call(box.querySelectorAll('._bupp-lina._bupp-tomt'));
    var vixl = box.querySelector('._bupp-vixl');
    var lina = box.querySelector(':scope > .b411-oskrad');
    if (!tom.length) { if (lina) { if (vixl && lina.contains(vixl)) box.appendChild(vixl); lina.remove(); } return; }
    if (!lina) {
      lina = document.createElement('div'); lina.className = 'b411-oskrad';
      lina.innerHTML = '<b>Óskráð</b><span></span>';
      box.appendChild(lina);
    }
    var nofn = tom.map(function (l) { return txt(l.querySelector('._bupp-merki')) || txt(l).slice(0, 14); }).filter(Boolean).join(' · ');
    var sp = lina.querySelector('span'); if (sp && sp.textContent !== nofn) sp.textContent = nofn;
    if (vixl && vixl.parentElement !== lina) lina.appendChild(vixl);     // sami takki, sama hlustun (363)
    if (box.lastElementChild !== lina) box.appendChild(lina);
  }

  // ── 3) athugasemdin vex með textanum upp í 5 línur; meira/minna þar fyrir ofan ──
  function fit(ta) {
    var max = LINA_H * MAX_LINUR + 14;
    var takki = ta.parentElement && ta.parentElement.querySelector('.b411-meira');
    ta.style.setProperty('height', '36px', 'important');   // 338/402 setja hæð með !important — inline án important tapar
    var h = ta.value ? ta.scrollHeight : 36;                 // tómur reitur: scrollHeight telur placeholder-textann (2 línur) — ein lína samt
    var opin = ta.classList.contains('b411-opin');
    if (h <= max) {
      ta.style.setProperty('height', Math.max(36, h) + 'px', 'important');
      if (takki) takki.classList.remove('syna');
    } else {
      ta.style.setProperty('height', (opin ? h : max) + 'px', 'important');
      if (takki) {
        var linur = Math.round((h - 14) / LINA_H);
        takki.textContent = opin ? '⌃ Minna' : '⌄ Sýna allt · ' + linur + ' línur';
        takki.classList.add('syna');
      }
    }
  }
  function note(ta) {
    if (ta.__b411) { fit(ta); return; }
    ta.__b411 = true;
    ta.rows = 1;
    var p = ta.parentElement;
    if (p && !p.querySelector('.b411-meira')) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'b411-meira'; b.textContent = '⌄ Sýna allt';
      b.addEventListener('click', function () { ta.classList.toggle('b411-opin'); fit(ta); });
      if (ta.nextSibling) p.insertBefore(b, ta.nextSibling); else p.appendChild(b);
    }
    ta.addEventListener('input', function () { fit(ta); });
    fit(ta);
  }

  // ── 5) Samskipti-spjaldið: þétt sjálfgefið, „Meira" opnar allt (staðan lifir í vafranum — útlitsval) ──
  var SAMSK_LYKILL = 'samsk_opid';
  function samskOpid() { try { return localStorage.getItem(SAMSK_LYKILL) === '1'; } catch (_) { return false; } }
  function samsk(card) {
    var opid = samskOpid();
    // 24.09.2026: þétta útlitið er sjálfgefið í CSS (:not(.b411-opid)) svo kortið málast ALDREI fyrst í fullri hæð (371 px) og
    // skreppur svo saman (159 px) þegar tifið nær því — það var 212 px hopp ~400 ms eftir að 286 teiknaði. Klasinn merkir aðeins OPIÐ.
    if (card.classList.contains('b411-opid') !== opid) card.classList.toggle('b411-opid', opid);
    var acts = card.querySelector('._skx-head ._skx-acts');
    var b = card.querySelector('.b411-samsk-meira');
    if (!b && acts) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'b411-samsk-meira';
      b.addEventListener('click', function () { try { localStorage.setItem(SAMSK_LYKILL, samskOpid() ? '0' : '1'); } catch (_) {} tick(); });
      acts.appendChild(b);
    }
    if (b) { var t = opid ? '⌃ Minna' : '⌄ Meira'; if (b.textContent !== t) b.textContent = t; if (acts && b.parentElement !== acts) acts.appendChild(b); }
  }

  var timer = null;
  function tick() {
    if (!scope()) return;
    var main = document.getElementById('companies-main'); if (!main) return;
    Array.prototype.slice.call(main.querySelectorAll('.co-bupp')).forEach(function (box) { try { oskrad(box); } catch (e) { console.error('[411]', e); } });
    Array.prototype.slice.call(main.querySelectorAll('.co-banner-right .co-banner-note')).forEach(function (ta) { try { note(ta); } catch (e) { console.error('[411]', e); } });
    Array.prototype.slice.call(main.querySelectorAll('.card._samskipti-card')).forEach(function (c) { try { samsk(c); } catch (e) { console.error('[411]', e); } });
  }
  function schedule() { if (schedule.inni) return; schedule.inni = true; try { tick(); } finally { schedule.inni = false; } }   // 24.09.2026: vaktin (252) skilar sér í rAF, FYRIR málun — setTimeout héðan lenti EFTIR málun og hrái ramminn sást sem hopp (mælt: 224-listinn 601 → 741 px, valstikan 205 → 154 px). Sama tif, engin millistaða.
  (function watch() {
    var main = document.getElementById('companies-main');
    if (!main) { setTimeout(watch, 500); return; }
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) { var t = ms[i].target; if (t && t.closest && t.closest('.b411-oskrad,.b411-meira,.b411-samsk-meira')) continue; schedule(); return; }
    }).observe(main, { childList: true, subtree: true });
    tick();
  })();
  setInterval(tick, 1200);
  window.addEventListener('resize', schedule);
})();
