/* === CG CAPTURE v1 ===
   Lets Agnar tap a "🎯 CG" button, tap any kr-total box on THIS app, and have
   it show up in Brunahólf's Skýrslur tab. Slökkvitæki and Brunahólf are
   separate apps/origins so localStorage never crosses between them — this
   POSTs straight to Brunahólf's shared cg-entries endpoint instead
   (brunaholf/netlify/functions/cg-entries.js, table cg_entries).
   Beiðni: Verkefnalisti 664205fc feedback — "get ekki sett CG-id á
   slökkvitæki eða tengt" (2026-08-05). */
(() => {
  if (window.__cgCaptureInstalled) return;
  window.__cgCaptureInstalled = true;

  const ENDPOINT = 'https://brunaholf.netlify.app/api/cg-entries';

  function active() { try { return localStorage.getItem('cg_capture_sk') === '1'; } catch (_) { return false; } }
  function setActive(v) { try { v ? localStorage.setItem('cg_capture_sk', '1') : localStorage.removeItem('cg_capture_sk'); } catch (_) {} }

  function currentTab() {
    try { return (window.App && App.currentView) || location.hash.replace('#', '') || 'slokkvitaeki'; }
    catch (_) { return 'slokkvitaeki'; }
  }

  function findContainer(el) {
    let node = el, best = null;
    for (let i = 0; i < 7 && node && node !== document.body; i++, node = node.parentElement) {
      const txt = node.textContent || '';
      if (/\d[\d.  ]*\s*kr\b/.test(txt) && txt.replace(/\s+/g, ' ').length < 600) best = node;
    }
    return best;
  }
  function extractKr(cont) {
    const m = (cont.textContent || '').match(/[\d][\d.  ]*\s*kr\b/g);
    if (!m) return null;
    const nums = m.map(s => parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0).filter(n => n > 0);
    return nums.length ? Math.max.apply(null, nums) : null;
  }
  function extractLabel(cont) {
    const t = (cont.textContent || '').replace(/\s+/g, ' ').trim();
    const m = t.match(/^([^\d]{2,}?)\s*\d/);
    let lab = (m ? m[1] : t).trim().replace(/[·:|\-]+$/, '').trim();
    return (lab || 'Slökkvitæki gluggi').slice(0, 44);
  }

  function onClick(e) {
    const tgt = e.target;
    if (!tgt || !tgt.closest) return;
    if (tgt.closest('#cg-sk-banner') || tgt.closest('#cg-sk-modal')) return;
    if (tgt.closest('nav,aside,header,a,button,select,input,textarea')) return;
    const cont = findContainer(tgt);
    if (!cont) return;
    const value = extractKr(cont);
    if (value == null) return;
    e.preventDefault(); e.stopPropagation();
    openModal(extractLabel(cont), value);
  }

  function syncBanner() {
    const on = active();
    let b = document.getElementById('cg-sk-banner');
    if (on && !b) {
      b = document.createElement('div');
      b.id = 'cg-sk-banner';
      b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:linear-gradient(180deg,#2f5fe0,#183a8c);color:#fff;padding:12px 16px;display:flex;align-items:center;gap:12px;justify-content:center;flex-wrap:wrap;font:600 13.5px system-ui,-apple-system,sans-serif;box-shadow:0 -8px 24px -10px rgba(0,0,0,.5)';
      b.innerHTML = '<span>🎯 <b>CG-upptaka virk</b> — smelltu á töluna sem á að bætast við Brunahólf-skýrslur.</span>' +
        '<button id="cg-sk-stop" type="button" style="border:1px solid rgba(255,255,255,.6);background:rgba(255,255,255,.16);color:#fff;border-radius:9px;padding:7px 14px;font:inherit;font-weight:700;cursor:pointer">✓ Hætta upptöku</button>';
      document.body.appendChild(b);
      b.querySelector('#cg-sk-stop').addEventListener('click', () => { setActive(false); syncBanner(); });
      document.addEventListener('click', onClick, true);
    } else if (!on && b) {
      b.remove();
      document.removeEventListener('click', onClick, true);
      const m = document.getElementById('cg-sk-modal'); if (m) m.remove();
    }
  }

  function openModal(label, value) {
    document.getElementById('cg-sk-modal')?.remove();
    const fmt = n => Math.round(Number(n) || 0).toLocaleString('is-IS').replace(/,/g, '.');
    const wrap = document.createElement('div');
    wrap.id = 'cg-sk-modal';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:20px';
    wrap.innerHTML = `<div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:22px;box-shadow:0 30px 60px -20px rgba(0,0,0,.5);font:14px system-ui,-apple-system,sans-serif">
      <div style="font-size:17px;font-weight:800;color:#11141c;margin-bottom:4px">➕ Senda í Brunahólf sem CG</div>
      <div style="font-size:12.5px;color:#8a93a5;margin-bottom:16px">Tekið af: slokkvitaeki.netlify.app</div>
      <label style="display:block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8a93a5;margin-bottom:5px">Heiti</label>
      <input id="cg-sk-name" value="${String(label).replace(/"/g, '&quot;')}" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d5dbe6;border-radius:10px;font:inherit;margin-bottom:14px">
      <label style="display:block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8a93a5;margin-bottom:5px">Gildi (kr) — má lagfæra</label>
      <input id="cg-sk-val" value="${fmt(value)}" inputmode="numeric" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d5dbe6;border-radius:10px;font:inherit;margin-bottom:18px">
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button id="cg-sk-cancel" type="button" style="border:1px solid #d5dbe6;background:#fff;border-radius:10px;padding:9px 16px;font:inherit;font-weight:700;color:#334155;cursor:pointer">Hætta við</button>
        <button id="cg-sk-save" type="button" style="border:1px solid #2f5fe0;background:linear-gradient(180deg,#4f7bff,#2f5fe0);color:#fff;border-radius:10px;padding:9px 16px;font:inherit;font-weight:700;cursor:pointer">Vista sem CG</button>
      </div></div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener('click', ev => { if (ev.target === wrap) close(); });
    wrap.querySelector('#cg-sk-cancel').addEventListener('click', close);
    wrap.querySelector('#cg-sk-save').addEventListener('click', () => {
      const nm = (wrap.querySelector('#cg-sk-name').value || '').trim() || 'Slökkvitæki gluggi';
      const vv = parseInt((wrap.querySelector('#cg-sk-val').value || '').replace(/[^\d]/g, ''), 10) || 0;
      save(nm, vv);
      close();
    });
  }

  function save(label, value) {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'record', label, value,
        source_app: 'slokkvitaeki', tab: currentTab(), url: location.href,
        formula: 'Handvirkt CG — tekið af Slökkvitæki', manual: true,
      }),
    }).then(r => r.json()).then(d => {
      if (window.Toast && Toast.show) Toast.show(d && d.ok ? '✓ ' + (d.entry && d.entry.id) + ' sent í Brunahólf' : 'Villa við að senda CG');
    }).catch(() => { if (window.Toast && Toast.show) Toast.show('Villa við að senda CG'); });
  }

  function ensureTrigger() {
    if (document.getElementById('cg-sk-trigger')) return;
    const btn = document.createElement('button');
    btn.id = 'cg-sk-trigger';
    btn.type = 'button';
    btn.title = 'Senda tölu úr þessari síðu í Brunahólf sem CG';
    btn.textContent = '🎯 CG';
    btn.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99900;border:1px solid #2f5fe0;background:#fff;color:#2f5fe0;border-radius:20px;padding:8px 14px;font:700 12px system-ui,-apple-system,sans-serif;box-shadow:0 6px 18px -6px rgba(0,0,0,.3);cursor:pointer';
    btn.addEventListener('click', () => { setActive(!active()); syncBanner(); });
    document.body.appendChild(btn);
  }

  document.addEventListener('DOMContentLoaded', ensureTrigger);
  if (document.readyState !== 'loading') ensureTrigger();
  syncBanner();
  console.log('[patch-296] cg-capture installed — 🎯 CG button bottom-left, sends to brunaholf cg-entries');
})();
/* === END CG CAPTURE === */
