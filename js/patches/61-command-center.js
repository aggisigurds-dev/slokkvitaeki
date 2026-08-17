/* === STJÓRNSTÖÐ / COMMAND CENTER v2 === */
(() => {
  if (window.__cmdCenterInstalled) return;
  window.__cmdCenterInstalled = true;

  function getSB(){ return window.DB && window.DB.sb; }
  function fmtKr(n){if(!n&&n!==0)return'—';const s=Math.round(Math.abs(n)).toString();const r=[];let t=s;while(t.length>3){r.unshift(t.slice(-3));t=t.slice(0,-3);}r.unshift(t);return (n<0?'−':'')+r.join('.')+' kr';}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  // ── Sölu-flokkun (birting eingöngu — breytir ALDREI solur-röðum) ──────────────
  // greitt_med er geymt sem 'Kort' / 'Pening' / 'reikningur' / 'greitt_sidar' í pos.js.
  function payKey(g){
    const x = String(g||'').toLowerCase();
    if (/kort/.test(x)) return 'kort';
    if (/pening|reiðu|reidu/.test(x)) return 'pening';
    if (/greitt_sidar|síðar|sidar/.test(x)) return 'sidar';
    if (/reikning/.test(x)) return 'reikningur';
    return 'annad';
  }
  // Reikningar úr skoðunar-/úttektarskýrslum: fire-ext úttekt (patch 165 source
  // 'uttekt') + brunakerfi skoðunarskýrsla (patch 273 source 'brunakerfi').
  function isInsp(src){ const s = String(src||'').toLowerCase(); return s === 'uttekt' || s === 'brunakerfi'; }
  function dayKey(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  // „Raun-dagsetning" sölu: fyrir STAÐGREITT (kort/pening) er það DAGURINN SEM
  // greitt var (paid_at) — „greitt síðar" drög sem eru sótt+greidd með korti í dag
  // halda gamla created_at (móttöku-degi) en fá paid_at=í dag, svo fjárstreymið
  // á að lenda á greiðsludeginum. Reikningar/úttektir eru áfram á skráningardegi.
  function effDate(r){
    const m = payKey(r.greitt_med);
    if ((m === 'kort' || m === 'pening') && r.paid_at) return r.paid_at;
    return r.created_at;
  }

  let _ccSales = [];       // solur-raðir í glugganum (samtals,created_at,greitt_med,source,status)
  let _ccPeriod = '14d';   // valið tímabil fyrir sundurliðunina
  let _ccChart = [];       // 14-daga súlur (byggt í buildChart14)
  let _ccSelDay = null;    // valinn dagur (key) í súluritinu — sýnir sundurliðun
  let _ccSelCat = null;    // valinn greiðslumáta-flokkur í skýringunni
  const PERIOD_LABEL = { idag:'Í dag', '7d':'Síðustu 7 daga', '14d':'Síðustu 14 daga', manudur:'Þennan mánuð' };

  // 2026-07-14: birtingar-hreinsun á ógreiddum sölum (breytir ALDREI solur-röðum):
  //  a) sleppa röðum með samtals=0 OG engum merkingarbærum viðskiptavini
  //     (tómt / "0" / "—" / "Viðskiptavinur" placeholder);
  //  b) para kreditreikninga: neikvæð upphæð + ógreidd jákvæð upphæð sömu
  //     stærðar hjá SAMA viðskiptavini = uppgert par → bæði út af listanum.
  //     Íhaldssamt: aðeins nákvæm upphæða-speglun (X og −X) parast.
  function netUnpaidRows(rows, getName, getAmt){
    const meaningless = n => { const s=String(n==null?'':n).trim(); return !s || s==='0' || s==='—' || /^viðskiptavinur$/i.test(s); };
    const list = (rows||[]).filter(r => {
      const amt = Math.round(parseFloat(getAmt(r))||0);
      return !(amt===0 && meaningless(getName(r)));
    });
    const key = r => String(getName(r)||'').trim().toLowerCase();
    const drop = new Set();
    list.forEach((neg,i) => {
      const na = Math.round(parseFloat(getAmt(neg))||0);
      if (na >= 0 || drop.has(i)) return;
      const j = list.findIndex((pos,k) => !drop.has(k) && k!==i &&
        Math.round(parseFloat(getAmt(pos))||0) === -na && key(pos)===key(neg) && key(neg)!=='');
      if (j !== -1) { drop.add(i); drop.add(j); }
    });
    return list.filter((_,i)=>!drop.has(i));
  }

  function ensureNav(){
    if (document.querySelector('.vnav-btn[data-view="stjornstod"]')) return;
    const sample = document.querySelector('.vnav-btn[data-view="counter"]') || document.querySelector('.vnav-btn[data-view="yfirlit"]');
    if (!sample) return;
    const btn = sample.cloneNode(false);
    btn.className = sample.className.replace(/\bactive\b/g,'').trim();
    btn.dataset.view = 'stjornstod';
    btn.textContent = '🎯 Stjórnstöð';
    btn.onclick = () => window.App && window.App.switchView('stjornstod');
    sample.parentElement.insertBefore(btn, sample.nextSibling);
  }
  function ensureView(){
    if (document.getElementById('view-stjornstod')) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = 'view-stjornstod';
    v.className = sample.className.replace(/\bactive\b/g,'').trim();
    v.innerHTML = '<main id="cc-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }
  function patchSwitch(){
    if (!window.App || window.App._ccPatch) return;
    const orig = window.App.switchView;
    window.App.switchView = function(view){
      if (view==='stjornstod'){
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v=>{ v.style.display='none'; v.classList.remove('active'); });
        const v=document.getElementById('view-stjornstod');
        if (v){ v.style.display='block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view==='stjornstod'));
        load(); return;
      }
      orig.apply(this, arguments);
    };
    window.App._ccPatch = true;
  }

  async function load(){
    const main = document.querySelector('#view-stjornstod #cc-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">Hleður...</div>';
    const SB = getSB(); if (!SB) return;
    // Supabase query builders are thenables, not real Promises — they don't
    // have .catch(). Use async/try-catch instead so the wrapper works whether
    // the input is a Promise, a Postgrest query builder, or any thenable.
    const safe = async p => {
      try { return await p; }
      catch (e) { return { data: [], count: 0, error: e }; }
    };
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const in30 = new Date(today); in30.setDate(in30.getDate()+30);

    // 14-day window for the revenue chart. Fetch from the EARLIER of month-start
    // and 14 days back (so the month card AND the 14-day chart are both covered
    // by one query), up to start-of-tomorrow so today's sales are included.
    const fourteenBack = new Date(today); fourteenBack.setDate(fourteenBack.getDate() - 13);
    const fetchSince = fourteenBack < monthStart ? fourteenBack : monthStart;
    const [sales, unpaid, openJobs, todayJobs, dueInsp, lowStock, contractsDue] = await Promise.all([
      // ALLAR raðir (líka drög) — við flokkum sjálf; drög fyrir 'greitt_sidar' eru
      // væntanleg innheimta, önnur drög eru sleppt í tekjum. Tökum bæði raðir sem
      // voru SKRÁÐAR og raðir sem voru GREIDDAR í glugganum (gömul drög sótt í dag).
      safe(SB.from('solur').select('samtals,created_at,paid_at,greitt_med,source,status')
        .or('created_at.gte.' + fetchSince.toISOString() + ',paid_at.gte.' + fetchSince.toISOString())),
      // void teljist ALDREI skuld (2026-08-14, R-000232 lexían) — drog var þegar síað.
      safe(SB.from('solur').select('id,samtals,customer_nafn').neq('status','drog').neq('status','void').in('greitt_med',['reikningur','greitt_sidar']).is('paid_at',null)),
      safe(SB.from('verkbeidnir').select('id,num,customer,status').neq('status','done').neq('status','cancelled')),
      safe(SB.from('verkdagbok').select('id,fyrirtaeki,job_date,athugasemdir').gte('job_date', today.toISOString().slice(0,10)).lt('job_date', tomorrow.toISOString().slice(0,10)).order('job_date')),
      // 3.749 tæki eru á gjalddaga innan 30 daga — stök .select() skilaði 1000,
      // svo Stjórnstöðin sýndi aðeins ~27% af því sem er að falla á tíma.
      safe(DB.fetchAll((from, to) => SB.from('uttaeki').select('id,serial,client,next_insp').not('next_insp','is',null).lte('next_insp', in30.toISOString().slice(0,10)).order('id').range(from, to)).then(rows => ({ data: rows }))),
      safe(SB.from('birgdir').select('id,nafn,magn,lagmark').filter('magn','lt','lagmark')),
      safe(SB.from('thjonustusamningar').select('id,company_nafn,upphaed_an_vsk,next_due').lte('next_due', in30.toISOString().slice(0,10)).eq('status','virkur'))
    ]);

    _ccSales = sales.data || [];

    // Tekjur þessa mánaðar = allar (ekki-drög) sölur frá 1. þessa mánaðar.
    const monthRev = _ccSales
      .filter(r => String(r.status||'') !== 'drog' && new Date(effDate(r)) >= monthStart)
      .reduce((s,r)=>s+(parseFloat(r.samtals)||0),0);

    // 2026-07-14: hreinsa ógreiddu-listann (birting eingöngu — solur óbreyttar):
    //  a) 0-kr raðir án merkingarbærs viðskiptavinar ("0", tómt, "Viðskiptavinur")
    //     eru ekki útistandandi krafa;
    //  b) reikningur + kreditreikningur sama viðskiptavinar sem núlla hvor annan
    //     út (t.d. SAFÍR ±323.331) teljast uppgerð par og detta bæði út.
    const unpaidRows = netUnpaidRows(unpaid.data||[], r=>r.customer_nafn, r=>r.samtals);
    const unpaidTotal = unpaidRows.reduce((s,r)=>s+(parseFloat(r.samtals)||0),0);
    const techs = new Set((todayJobs.data||[]).map(r=>r.assigned_to).filter(Boolean));

    _ccChart = buildChart14(_ccSales);
    _ccSelDay = null; _ccSelCat = null;

    const greeting = (() => {
      const h = new Date().getHours();
      if (h < 5) return '🌙 Góða nótt';
      if (h < 12) return '☀️ Góðan daginn';
      if (h < 18) return '🌤 Góðan dag';
      return '🌆 Gott kvöld';
    })();

    // Build the date string manually — Chrome on Windows falls back to
    // en-US for 'is-IS' long-form locale data ("Saturday, May 16, 2026"),
    // so we use Icelandic arrays directly to guarantee Icelandic output.
    const WEEKDAYS_IS = ['sunnudagur','mánudagur','þriðjudagur','miðvikudagur','fimmtudagur','föstudagur','laugardagur'];
    const MONTHS_LONG_IS = ['janúar','febrúar','mars','apríl','maí','júní','júlí','ágúst','september','október','nóvember','desember'];
    const _dn = new Date();
    const dayName = WEEKDAYS_IS[_dn.getDay()].charAt(0).toUpperCase() + WEEKDAYS_IS[_dn.getDay()].slice(1) +
                    ', ' + _dn.getDate() + '. ' + MONTHS_LONG_IS[_dn.getMonth()] + ' ' + _dn.getFullYear();

    main.innerHTML = `
      <div style="max-width:1280px;margin:0 auto">
        <div style="margin-bottom:18px">
          <h1 style="margin:0;font-size:24px;font-weight:600">${greeting}</h1>
          <div style="font-size:14px;color:#64748b">${dayName}</div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:20px">
          ${cardHtml('💰', 'Tekjur þessa mánaðar', fmtKr(monthRev), '#16a34a', '#dcfce7')}
          ${cardHtml('⚠️', 'Útistandandi kröfur', fmtKr(unpaidTotal), '#dc2626', '#fee2e2', `${unpaidRows.length} reikningar`)}
          ${cardHtml('🔧', 'Verk í gangi', (openJobs.data||[]).length, '#3b82f6', '#dbeafe')}
          ${cardHtml('📍', 'Verk í dag', (todayJobs.data||[]).length, '#8b5cf6', '#ede9fe', `${techs.size} tæknimenn úti`)}
          ${cardHtml('🔥', 'Tæki sem þurfa skoðun', (dueInsp.data||[]).length, '#f59e0b', '#fef3c7', 'Næstu 30 daga')}
          ${cardHtml('📦', 'Lág-birgðir', (lowStock.data||[]).length, '#ec4899', '#fce7f3', (lowStock.data||[]).length?'Þarf að panta':'Allt í lagi')}
          ${cardHtml('📑', 'Samningar á rukkun', (contractsDue.data||[]).length, '#0ea5e9', '#e0f2fe', 'Næstu 30 daga')}
        </div>

        <div id="cc-revenue" style="margin-bottom:14px">${renderChartSection()}</div>

        <div id="cc-rev-breakdown" style="margin-bottom:14px">${renderBreakdown()}</div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:14px">
          <div class="cc-section">
            <h3>📍 Verk í dag</h3>
            ${(todayJobs.data||[]).length ? (todayJobs.data||[]).map(j=>`
              <div class="cc-row">
                <div><strong>${esc(j.athugasemdir||j.fyrirtaeki||'Verk')}</strong></div>
                <div style="font-size:12px;color:#64748b">${j.fyrirtaeki?'🏢 '+esc(j.fyrirtaeki):''}</div>
              </div>`).join('') : '<div class="cc-empty">🌴 Engin verk í dag</div>'}
            <button class="btn btn-outline btn-sm" style="margin-top:8px;width:100%" onclick="App.switchView('verkdagbok')">Sjá dagbók →</button>
          </div>

          <div class="cc-section">
            <h3>⚠️ Stærstu ógreiddu</h3>
            ${unpaidRows.slice().sort((a,b)=>(parseFloat(b.samtals)||0)-(parseFloat(a.samtals)||0)).slice(0,5).map(u=>`
              <div class="cc-row">
                <div><strong>${esc(u.customer_nafn||'')}</strong></div>
                <div style="font-size:13px;color:#dc2626;font-weight:600">${fmtKr(u.samtals)}</div>
              </div>`).join('') || '<div class="cc-empty">✓ Allt greitt</div>'}
            <button class="btn btn-outline btn-sm" style="margin-top:8px;width:100%" onclick="if(window.AgingReport&&AgingReport.open)AgingReport.open();else App.switchView('aging-report')">Aldursgreining →</button>
          </div>

          <div class="cc-section">
            <h3>🔥 Þjónustutæki sem þarfnast skoðunar</h3>
            ${(dueInsp.data||[]).slice(0,5).map(d=>`
              <div class="cc-row">
                <div><strong>${esc(d.serial||'')}</strong> ${esc(d.client||'')}</div>
                <div style="font-size:12px;color:#f59e0b">Næsta: ${esc(d.next_insp)}</div>
              </div>`).join('') || '<div class="cc-empty">✓ Allt á áætlun</div>'}
            <button class="btn btn-outline btn-sm" style="margin-top:8px;width:100%" onclick="App.switchView('field')">Þjónustuáætlun →</button>
          </div>

          <div class="cc-section">
            <h3>📦 Lág-birgðir</h3>
            ${(lowStock.data||[]).slice(0,5).map(s=>`
              <div class="cc-row">
                <div><strong>${esc(s.nafn||'')}</strong></div>
                <div style="font-size:12px;color:#ec4899">${s.magn||0} (lágmark ${s.lagmark||0})</div>
              </div>`).join('') || '<div class="cc-empty">✓ Engar lág-birgðir</div>'}
            <button class="btn btn-outline btn-sm" style="margin-top:8px;width:100%" onclick="App.switchView('birgdir')">Birgðir →</button>
          </div>
        </div>
      </div>`;

    injectStyle();
  }

  function cardHtml(icon, label, value, color, bg, sub){
    return `<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.04);border-left:4px solid ${color}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div style="width:32px;height:32px;border-radius:8px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:18px">${icon}</div>
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">${esc(label)}</div>
      </div>
      <div style="font-size:24px;font-weight:700;color:${color}">${value}</div>
      ${sub?`<div style="font-size:11px;color:#94a3b8;margin-top:2px">${esc(sub)}</div>`:''}
    </div>`;
  }

  // ── 14-daga súlurit: hver dagur er STAFLAÐUR eftir greiðslumáta ──────────────
  // Botn→topp: Peningur (grænt) · Kort (blátt) · Reikningur (gult) · Annað (grátt)
  // · Úttektir (fjólublátt). Þannig sést „hversu mikið innheimt per dag" + skiptingin
  // milli korts og peninga sem óskað var eftir.
  function buildChart14(rows){
    const today = new Date(); today.setHours(0,0,0,0);
    const todayKey = dayKey(new Date());
    const buckets = [];
    for (let i = 13; i >= 0; i--){
      const d = new Date(today); d.setDate(d.getDate() - i);
      buckets.push({ key: dayKey(d), d,
        label: ['Sun','Mán','Þri','Mið','Fim','Fös','Lau'][d.getDay()], dayNum: d.getDate(),
        isToday: dayKey(d) === todayKey, kort:0, pening:0, reikningur:0, annad:0, insp:0, total:0, count:0 });
    }
    const idx = {}; buckets.forEach(b => idx[b.key] = b);
    rows.forEach(r => {
      const b = idx[dayKey(new Date(effDate(r)))]; if (!b) return;
      const amt = parseFloat(r.samtals) || 0;
      if (amt <= 0) return; // kreditreikningar/0 sleppt úr myndinni (rétt í tölum að neðan)
      const st = String(r.status||'');
      if (isInsp(r.source)){ if (st !== 'drog'){ b.insp += amt; b.total += amt; b.count++; } return; }
      const m = payKey(r.greitt_med);
      if (m === 'sidar') return;      // ógreitt (drög) — ekki innheimt þennan dag
      if (st === 'drog') return;      // önnur drög sleppt
      if (m === 'kort') b.kort += amt;
      else if (m === 'pening') b.pening += amt;
      else if (m === 'reikningur') b.reikningur += amt;
      else b.annad += amt;
      b.total += amt; b.count++;
    });
    return buckets;
  }

  const SEGS = [
    ['pening', '#16a34a', 'Peningur'],
    ['kort', '#2563eb', 'Kort'],
    ['reikningur', '#f59e0b', 'Reikningur'],
    ['annad', '#94a3b8', 'Annað'],
    ['insp', '#8b5cf6', 'Úttektir']
  ];
  const SEG_LABEL = SEGS.reduce((o,[k,,l])=>{o[k]=l;return o;},{});
  const SEG_COLOR = SEGS.reduce((o,[k,c])=>{o[k]=c;return o;},{});

  // Gagnvirkt 14-daga súlurit: smellur á DAG → sundurliðun dagsins; smellur á
  // FLOKK í skýringu → 14-daga samtala flokksins + hinir daufir. Efst „Í dag"
  // ræma með korta-/peninga-fjárstreymi dagsins (afhending úr hleðslu o.fl.).
  function renderChartSection(){
    const buckets = _ccChart;
    const max = Math.max(1, ...buckets.map(b => b.total));
    const weekTotal = buckets.reduce((s,b)=>s+b.total,0);
    const avg = weekTotal / (buckets.length || 1);
    const today = buckets.find(b => b.isToday) || { kort:0, pening:0, reikningur:0, insp:0, total:0, count:0 };

    const bars = buckets.map(b => {
      const isSel = _ccSelDay === b.key;
      const segHtml = SEGS.map(([k,c]) => {
        const pct = b[k] > 0 ? (b[k] / max * 100) : 0;
        if (pct <= 0) return '';
        const dim = _ccSelCat && _ccSelCat !== k ? 'opacity:.18;' : '';
        return `<div style="height:${pct}%;background:${c};${dim}"></div>`;
      }).join('');
      const tip = `${b.label} ${b.dayNum}. — ${fmtKr(b.total)} · ${b.count} sölur` +
        SEGS.filter(([k]) => b[k] > 0).map(([k,,lbl]) => `\n${lbl}: ${fmtKr(b[k])}`).join('');
      const valLabel = b.total === 0 ? '' : fmtKrShort(b.total);
      const labelColor = b.isToday ? '#dc2626' : (isSel ? '#0f172a' : '#64748b');
      return `
        <div class="cc-chart-col${isSel?' cc-col-sel':''}" title="${esc(tip)}" onclick="CommandCenter.selectDay('${b.key}')">
          <div class="cc-chart-val" style="color:${labelColor}">${valLabel}</div>
          <div class="cc-chart-bar-wrap">
            <div class="cc-stack${b.isToday?' cc-today':''}${isSel?' cc-stack-sel':''}">${segHtml || '<div class="cc-zero"></div>'}</div>
          </div>
          <div class="cc-chart-day" style="color:${labelColor};font-weight:${(b.isToday||isSel)?'700':'500'}">${b.label}</div>
          <div class="cc-chart-date" style="color:${labelColor};opacity:.7">${b.dayNum}</div>
        </div>`;
    }).join('');

    const legend = SEGS.map(([k,c,lbl]) =>
      `<button type="button" class="cc-leg${_ccSelCat===k?' on':''}" onclick="CommandCenter.selectCat('${k}')"><i style="background:${c}"></i>${lbl}</button>`
    ).join('');

    // sundurliðunar-reitur undir súluritinu
    let detail;
    if (_ccSelDay){
      const b = buckets.find(x => x.key === _ccSelDay);
      detail = b ? dayDetailHtml(b) : '';
    } else if (_ccSelCat){
      const sum = buckets.reduce((s,x)=>s+(x[_ccSelCat]||0),0);
      const top = buckets.filter(x=>x[_ccSelCat]>0).sort((a,c)=>c[_ccSelCat]-a[_ccSelCat]).slice(0,3)
        .map(x=>`${x.label} ${x.dayNum}. ${fmtKr(x[_ccSelCat])}`).join(' · ');
      detail = `<div class="cc-detail"><div class="cc-detail-h"><b><i style="background:${SEG_COLOR[_ccSelCat]}"></i>${SEG_LABEL[_ccSelCat]}</b> — síðustu 14 daga <button class="cc-detail-x" onclick="CommandCenter.selectCat('${_ccSelCat}')">✕</button></div>
        <div class="cc-detail-big">${fmtKr(sum)}</div>${top?`<div class="cc-detail-sub">Stærstu dagar: ${esc(top)}</div>`:''}</div>`;
    } else {
      detail = `<div class="cc-detail cc-detail-hint">💡 Smelltu á dag eða flokk til að sjá sundurliðun.</div>`;
    }

    const todayStrip = `
      <div class="cc-today-strip">
        <div class="cc-today-lbl">💵 Fjárstreymi í dag</div>
        <div class="cc-today-cells">
          <div class="cc-today-cell"><span>💳 Kort</span><b>${fmtKr(today.kort)}</b></div>
          <div class="cc-today-cell"><span>💵 Peningar</span><b>${fmtKr(today.pening)}</b></div>
          <div class="cc-today-cell cc-tc-sum"><span>Staðgreitt í dag</span><b>${fmtKr(today.kort + today.pening)}</b></div>
          ${(today.reikningur||today.insp) ? `<div class="cc-today-cell cc-tc-muted"><span>🧾 Reikningar í dag</span><b>${fmtKr(today.reikningur + today.insp)}</b></div>` : ''}
        </div>
      </div>`;

    return `
      <div class="cc-section" style="padding:18px 20px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;flex-wrap:wrap;gap:8px">
          <div>
            <h3 style="margin:0;font-size:13px;font-weight:700">📊 Sala síðustu 14 daga</h3>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">Daglegar sölur eftir greiðslumáta (án draga) — smelltu til að rýna</div>
          </div>
          <div style="display:flex;gap:18px;align-items:baseline">
            <div style="text-align:right">
              <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Samtals</div>
              <div style="font-size:18px;font-weight:700;color:#16a34a">${fmtKr(weekTotal)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Meðaltal/dag</div>
              <div style="font-size:14px;font-weight:600;color:#475569">${fmtKr(avg)}</div>
            </div>
          </div>
        </div>
        ${todayStrip}
        <div class="cc-chart-bars">${bars}</div>
        <div class="cc-legend">${legend}</div>
        ${detail}
      </div>`;
  }

  function dayDetailHtml(b){
    const rows = SEGS.filter(([k]) => b[k] > 0)
      .map(([k,c,lbl]) => `<div class="cc-dd-row"><span><i style="background:${c}"></i>${lbl}</span><b>${fmtKr(b[k])}</b></div>`)
      .join('') || '<div class="cc-detail-sub">Engin sala þennan dag.</div>';
    const stad = b.kort + b.pening;
    return `<div class="cc-detail">
      <div class="cc-detail-h"><b>${b.label} ${b.dayNum}.</b> — ${b.count} sölur <button class="cc-detail-x" onclick="CommandCenter.selectDay('${b.key}')">✕</button></div>
      <div class="cc-detail-big">${fmtKr(b.total)}</div>
      ${rows}
      ${stad>0?`<div class="cc-dd-row cc-dd-tot"><span>💵 Fjárstreymi (staðgreitt)</span><b>${fmtKr(stad)}</b></div>`:''}
    </div>`;
  }

  // ── Sundurliðun sölu eftir greiðslumáta + úttektarskýrslu-reikningar ─────────
  function periodRows(rows, period){
    const since = new Date(); since.setHours(0,0,0,0);
    if (period === '7d') since.setDate(since.getDate() - 6);
    else if (period === '14d') since.setDate(since.getDate() - 13);
    else if (period === 'manudur') since.setDate(1);
    // 'idag' = frá miðnætti í dag. Notar raun-dag (greiðsludag fyrir staðgreitt).
    return rows.filter(r => new Date(effDate(r)) >= since);
  }
  function breakdown(rows){
    const b = { kort:0, pening:0, reikningur:0, annad:0, sidar:0, insp:0, count:0 };
    rows.forEach(r => {
      const amt = parseFloat(r.samtals) || 0;
      const st = String(r.status||'');
      if (isInsp(r.source)){ if (st !== 'drog') b.insp += amt; return; }
      const m = payKey(r.greitt_med);
      if (m === 'sidar'){ b.sidar += amt; return; }   // greitt síðar = bíður innheimtu (drög)
      if (st === 'drog') return;                        // önnur drög ekki tekjur
      b[m] = (b[m]||0) + amt;
      b.count++;
    });
    b.stadgreitt = b.kort + b.pening;
    b.workshop = b.stadgreitt + b.reikningur + b.annad;
    b.heild = b.workshop + b.insp;
    return b;
  }

  function renderBreakdown(){
    const b = breakdown(periodRows(_ccSales, _ccPeriod));
    const perBtn = (k, lbl) => `<button type="button" class="cc-per-btn${_ccPeriod===k?' on':''}" onclick="CommandCenter.setPeriod('${k}')">${lbl}</button>`;
    const line = (label, val, opts) => {
      opts = opts || {};
      return `<div class="cc-bd-row${opts.sub?' sub':''}${opts.strong?' strong':''}${opts.big?' big':''}">
        <span>${opts.sub?'· ':''}${esc(label)}</span><b>${fmtKr(val)}</b></div>`;
    };
    return `
      <div class="cc-section">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
          <div>
            <h3 style="margin:0;font-size:13px;font-weight:700">💵 Sala & tekjur — ${PERIOD_LABEL[_ccPeriod]}</h3>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">${b.count} sölur á verkstæði</div>
          </div>
          <div class="cc-per">${perBtn('idag','Í dag')}${perBtn('7d','7 daga')}${perBtn('14d','14 daga')}${perBtn('manudur','Mánuður')}</div>
        </div>
        <div class="cc-bd">
          <div class="cc-bd-grp">💵 Fjárstreymi <span>— innborgað núna</span></div>
          ${line('Staðgreitt', b.stadgreitt, {strong:true})}
          ${line('Greitt með korti', b.kort, {sub:true})}
          ${line('Greitt með peningum', b.pening, {sub:true})}
          ${b.annad ? line('Annað (millifærsla o.fl.)', b.annad) : ''}
          ${line('Samtals fjárstreymi', b.stadgreitt + b.annad, {strong:true})}
          <div class="cc-bd-div"></div>
          <div class="cc-bd-grp">🧾 Tekjuöflun <span>— reikningar, innheimt síðar</span></div>
          ${line('Sett í reikning (verkstæði)', b.reikningur)}
          ${line('Úttektarskýrslur', b.insp)}
          ${line('Samtals reikningar', b.reikningur + b.insp, {strong:true})}
          <div class="cc-bd-div"></div>
          ${line('Heildarsala', b.heild, {strong:true, big:true})}
          ${b.sidar ? `<div class="cc-bd-note">⏳ Greitt síðar (bíður innheimtu): <b>${fmtKr(b.sidar)}</b> — telst ekki með fyrr en sótt/greitt</div>` : ''}
        </div>
      </div>`;
  }

  // Compact currency formatter for above-bar labels: "12.500 kr" → "12,5þ".
  function fmtKrShort(n) {
    const v = Math.round(Number(n) || 0);
    if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.0','').replace('.', ',') + 'M';
    if (v >= 10000) return Math.round(v / 1000) + 'þ';
    if (v >= 1000) return (v / 1000).toFixed(1).replace('.', ',') + 'þ';
    return String(v);
  }

  function injectStyle(){
    if (document.getElementById('cc-style')) return;
    const s = document.createElement('style'); s.id = 'cc-style';
    s.textContent = `
      .cc-section{background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
      .cc-section h3{margin:0 0 10px;font-size:13px;font-weight:700}
      .cc-row{padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
      .cc-row:last-child{border-bottom:none}
      .cc-empty{padding:14px;text-align:center;color:#94a3b8;font-size:13px}
      .cc-chart-bars{display:grid;grid-template-columns:repeat(14,1fr);gap:6px;align-items:end;min-height:180px}
      .cc-chart-col{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;border-radius:6px;padding:2px 0}
      .cc-chart-col:hover{background:#f8fafc}
      .cc-chart-col.cc-col-sel{background:#eef2ff}
      .cc-chart-val{font-size:9.5px;font-weight:600;font-variant-numeric:tabular-nums;height:13px;line-height:13px;white-space:nowrap}
      .cc-chart-bar-wrap{width:100%;height:140px;display:flex;align-items:flex-end;justify-content:center;padding:0 2px}
      .cc-stack{width:100%;max-width:34px;height:100%;display:flex;flex-direction:column-reverse;justify-content:flex-start;border-radius:5px 5px 2px 2px;overflow:hidden}
      .cc-stack>div{width:100%;transition:height .35s cubic-bezier(.4,0,.2,1),opacity .2s}
      .cc-stack .cc-zero{height:1.5%;background:#e2e8f0}
      .cc-stack.cc-today{box-shadow:0 0 0 2px rgba(220,38,38,.28)}
      .cc-stack.cc-stack-sel{box-shadow:0 0 0 2px rgba(37,99,235,.45)}
      .cc-chart-col:hover .cc-stack{filter:brightness(1.06)}
      .cc-chart-day{font-size:10.5px;font-weight:600}
      .cc-chart-date{font-size:9.5px}
      .cc-legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid #f1f5f9}
      .cc-leg{display:flex;align-items:center;gap:5px;font-size:11px;color:#64748b;font-weight:600;background:#fff;border:1px solid #e2e8f0;border-radius:99px;padding:4px 10px;cursor:pointer}
      .cc-leg:hover{background:#f8fafc}
      .cc-leg.on{background:#0f172a;color:#fff;border-color:#0f172a}
      .cc-leg i{width:11px;height:11px;border-radius:3px;display:inline-block}
      /* Í dag — fjárstreymi ræma */
      .cc-today-strip{background:#f8fafc;border:1px solid #eef2f7;border-radius:10px;padding:10px 12px;margin-bottom:14px}
      .cc-today-lbl{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
      .cc-today-cells{display:flex;flex-wrap:wrap;gap:8px}
      .cc-today-cell{flex:1;min-width:120px;background:#fff;border:1px solid #eef2f7;border-radius:8px;padding:8px 11px;display:flex;flex-direction:column;gap:2px}
      .cc-today-cell span{font-size:11px;color:#64748b;font-weight:600}
      .cc-today-cell b{font-size:17px;font-weight:700;color:#0f172a}
      .cc-today-cell.cc-tc-sum{background:#ecfdf5;border-color:#a7f3d0}
      .cc-today-cell.cc-tc-sum b{color:#16a34a}
      .cc-today-cell.cc-tc-muted b{color:#b45309;font-size:15px}
      /* sundurliðunar-reitur */
      .cc-detail{margin-top:14px;padding:12px 14px;background:#f8fafc;border:1px solid #eef2f7;border-radius:10px}
      .cc-detail-hint{color:#94a3b8;font-size:12.5px;text-align:center;background:#fff}
      .cc-detail-h{font-size:13px;color:#475569;margin-bottom:6px;display:flex;align-items:center;gap:6px}
      .cc-detail-h b{display:flex;align-items:center;gap:6px}
      .cc-detail-h i{width:11px;height:11px;border-radius:3px;display:inline-block}
      .cc-detail-x{margin-left:auto;border:0;background:none;color:#94a3b8;font-size:15px;cursor:pointer;padding:0 4px;line-height:1}
      .cc-detail-big{font-size:22px;font-weight:800;color:#16a34a;margin-bottom:6px}
      .cc-detail-sub{font-size:12px;color:#64748b}
      .cc-dd-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:4px 0;font-size:13px}
      .cc-dd-row span{display:flex;align-items:center;gap:7px;color:#475569}
      .cc-dd-row i{width:10px;height:10px;border-radius:3px;display:inline-block}
      .cc-dd-row b{font-weight:700}
      .cc-dd-tot{border-top:1px solid #e2e8f0;margin-top:4px;padding-top:7px}
      .cc-dd-tot b{color:#16a34a}
      .cc-bd-grp{font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:.04em;margin:2px 0 4px}
      .cc-bd-grp span{font-weight:600;color:#94a3b8;text-transform:none;letter-spacing:0}
      .cc-per{display:flex;gap:4px;flex-wrap:wrap}
      .cc-per-btn{border:1px solid #e2e8f0;background:#fff;color:#475569;font-size:12px;font-weight:600;padding:5px 11px;border-radius:8px;cursor:pointer}
      .cc-per-btn.on{background:#0f172a;border-color:#0f172a;color:#fff}
      .cc-bd{font-size:14px}
      .cc-bd-row{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;gap:12px}
      .cc-bd-row.sub{padding:3px 0 3px 4px;font-size:13px;color:#64748b}
      .cc-bd-row.sub b{color:#475569;font-weight:600}
      .cc-bd-row.strong{font-weight:700}
      .cc-bd-row.strong b{font-size:15px}
      .cc-bd-row.strong.big b{font-size:19px;color:#16a34a}
      .cc-bd-div{height:1px;background:#e2e8f0;margin:6px 0}
      .cc-bd-note{margin-top:8px;font-size:12px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px}
      @media (max-width:700px){
        .cc-chart-bars{gap:3px;min-height:150px}
        .cc-chart-bar-wrap{height:104px}
        .cc-chart-val{font-size:8px}
        .cc-stack{max-width:22px}
        .cc-chart-day{font-size:9px}
        .cc-chart-date{font-size:8px}
      }
    `;
    document.head.appendChild(s);
  }

  function init(){ ensureNav(); ensureView(); patchSwitch(); }
  setTimeout(init, 1000);
  setTimeout(init, 2500);

  function rerenderRevenue(){
    const el = document.getElementById('cc-revenue');
    if (el) el.innerHTML = renderChartSection();
  }
  window.CommandCenter = {
    load,
    setPeriod(p){
      _ccPeriod = p;
      const el = document.getElementById('cc-rev-breakdown');
      if (el) el.innerHTML = renderBreakdown();
    },
    selectDay(key){
      _ccSelDay = (_ccSelDay === key) ? null : key;
      _ccSelCat = null;
      rerenderRevenue();
    },
    selectCat(cat){
      _ccSelCat = (_ccSelCat === cat) ? null : cat;
      _ccSelDay = null;
      rerenderRevenue();
    }
  };
  console.log('[command-center] installed');
})();
