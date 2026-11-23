/* 525 — Þjónustutæki (#field) má ekki teikna þúsundir spjalda í einu.
 *
 * Field.render í modal.js setur ÖLL útrunnin tæki, öll gjaldfallin, alla
 * dagskrá og söguna í DOM. modal.js (refreshAll) nefnir ~1.700 spjöld.
 * Á síma staflast dálkarnir (app.css) svo skjalið varð ~200.000 px.
 * Hér er hver listi skorinn í 40 og „Sýna fleiri“ bætir við 40.
 * Gögnin í DB.cache eru ósnert. 153/187 ósnert.
 */
(function () {
  'use strict';
  if (window.__fieldTakmark525) return;
  window.__fieldTakmark525 = true;
  var PAGE = 40;
  var caps = { ov: PAGE, du: PAGE, sc: PAGE, hi: PAGE };

  function takki(texti, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-outline btn-sm';
    b.style.margin = '8px 12px 16px';
    b.textContent = texti;
    b.addEventListener('click', onClick);
    return b;
  }

  function setjaFjolda(col, index, shown, total) {
    if (!col) return;
    var n = col.querySelectorAll('.fcol-count')[index];
    if (n && total > shown) n.textContent = shown + ' / ' + total;
  }

  function install() {
    if (!window.Field || typeof Field.render !== 'function' || Field.render.__takmark) return false;
    var orig = Field.render;
    function wrapped() {
      var db = window.DB;
      if (!db || typeof db.getOverdue !== 'function') return orig.apply(this, arguments);
      var realOv = db.getOverdue;
      var realDue = db.getDue;
      var scAll = (db.cache && db.cache.schedule) || [];
      var hiAll = (db.cache && db.cache.history) || [];
      var ovAll = realOv.call(db);
      var dueAll = realDue.call(db);
      db.getOverdue = function () { return ovAll.slice(0, caps.ov); };
      db.getDue = function () { return dueAll.slice(0, caps.du); };
      if (db.cache) {
        db.cache.schedule = scAll.slice(0, caps.sc);
        db.cache.history = hiAll.slice(0, caps.hi);
      }
      try { orig.apply(this, arguments); }
      finally {
        db.getOverdue = realOv;
        db.getDue = realDue;
        if (db.cache) { db.cache.schedule = scAll; db.cache.history = hiAll; }
      }
      var ae = document.getElementById('field-alerts');
      if (ae) {
        setjaFjolda(ae, 0, Math.min(caps.ov, ovAll.length), ovAll.length);
        setjaFjolda(ae, 1, Math.min(caps.du, dueAll.length), dueAll.length);
        var titlar = ae.querySelectorAll('.fcol-title');
        if (ovAll.length > caps.ov && titlar[1]) {
          titlar[1].parentNode.insertBefore(takki('Sýna fleiri útrunnin (' + (ovAll.length - caps.ov) + ' eftir)', function () {
            caps.ov += PAGE; Field.render();
          }), titlar[1]);
        } else if (ovAll.length > caps.ov) {
          ae.appendChild(takki('Sýna fleiri útrunnin (' + (ovAll.length - caps.ov) + ' eftir)', function () {
            caps.ov += PAGE; Field.render();
          }));
        }
        if (dueAll.length > caps.du) {
          ae.appendChild(takki('Sýna fleiri gjaldfallin (' + (dueAll.length - caps.du) + ' eftir)', function () {
            caps.du += PAGE; Field.render();
          }));
        }
      }
      var se = document.getElementById('field-schedule');
      if (se) {
        setjaFjolda(se, 0, Math.min(caps.sc, scAll.length), scAll.length);
        if (scAll.length > caps.sc) {
          se.appendChild(takki('Sýna fleiri heimsóknir (' + (scAll.length - caps.sc) + ' eftir)', function () {
            caps.sc += PAGE; Field.render();
          }));
        }
      }
      var he = document.getElementById('field-history');
      if (he) {
        setjaFjolda(he, 0, Math.min(caps.hi, hiAll.length), hiAll.length);
        if (hiAll.length > caps.hi) {
          he.appendChild(takki('Sýna fleiri í sögu (' + (hiAll.length - caps.hi) + ' eftir)', function () {
            caps.hi += PAGE; Field.render();
          }));
        }
      }
    }
    wrapped.__takmark = true;
    Field.render = wrapped;
    return true;
  }

  function reyna() { if (!install()) setTimeout(reyna, 200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reyna);
  else reyna();
})();
