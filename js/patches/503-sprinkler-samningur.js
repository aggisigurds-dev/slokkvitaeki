/* === SPRINKLER-ÞJÓNUSTUSAMNINGUR (503) — 11.11.2026 ===
   Agnar: „Hérna er basic þjónustusamningur fyrir sprinkler lagnir, ef þú getur útbúið útfyllanlegt form af því og
   getur sett það form inn á verðlistann hjá sprinkler og síðan líka inn í tilboð og samningar Page."

   Fyrirmyndin er fjögurra greina þjónustusamningur um eftirlit með vatnsúðakerfum: aðilar, umfang (1. gr.),
   skoðanir og þóknun (2. gr.), lagfæringar og skýrsluskil (3. gr.), gildistími og uppsögn (4. gr.), undirritun.

   HVAR:  • Tilboð & samningar (201): takkinn „Sprinkler-samningur" við hliðina á „Þjónustusamningur".
          • Verðlistinn Sprinklerkerfi (502): takkinn „Þjónustusamningur" vinstra megin við „⚙ Stillingar".
   GÖGN:  sama geymsla og önnur form síðunnar — app_settings.tilbod_hub (fylki), tegund 'sprinklersamn'.
          Birtist í „Vistuð form" og telst með „Samningar". Engin ný tafla.
   VERÐ:  ný form sækja þóknun úr verðlistanum Sprinklerkerfi (sp-q, sp-a, sp-akstur) EF verð er þar. Annars er
          reiturinn tómur og prentast sem auð lína til að fylla út — hér er ALDREI fundið upp verð.
          Vistaður samningur heldur sínum tölum; verðlistabreyting eftir á hreyfir hann ekki.
   REGLA: vistun er aldrei stöðvuð (ALLTAF LEYFA VISTUN) — vanti nafn verkkaupa er vistað og sagt frá.
   API:   window.SprinklerSamningur = { opna(form?), html(form), tegund }
*/
(() => {
  if (window.SprinklerSamningur) return;

  const TEG = 'sprinklersamn';
  const LISTI = 'sprinkler';
  const vf = () => (window.TilbodHub && window.TilbodHub.vf) || null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const SINNUM = ['', 'einu sinni', 'tvisvar', 'þrisvar', 'fjórum sinnum', 'fimm sinnum', 'sex sinnum', 'sjö sinnum', 'átta sinnum', 'níu sinnum', 'tíu sinnum', 'ellefu sinnum', 'tólf sinnum'];
  const sinnum = n => SINNUM[n] || (n + ' sinnum');
  // dd.mm.áááá — reiknað sjálft (toLocaleString getur fallið í en-US)
  const dags = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '.' + m[2] + '.' + m[1] : String(iso || ''); };

  // Sjálfgefinn texti. Fyrirmyndin vísaði í „reglugerð nr 75/2000 frá Mannvirkjastofnun" — 75/2000 eru LÖG um brunavarnir
  // og Mannvirkjastofnun heitir nú HMS. Hér er vísað í það sem gildir (112/2012 gr. 9.4.6 og leiðbeining HMS 9.4.6, sem
  // vísar í ÍST EN 12845 um viðhald og eftirlit). Reiturinn er frjáls texti — Agnar ræður orðalaginu.
  const SJ_REGLUR = 'Þjónustan skal vera í samræmi við lög um brunavarnir nr. 75/2000, byggingarreglugerð nr. 112/2012 og leiðbeiningar Húsnæðis- og mannvirkjastofnunar (HMS) um sjálfvirk slökkvikerfi, þar sem viðhald og eftirlit vatnsúðakerfa fer eftir ÍST EN 12845.';
  const SJ_GR3 = 'Ef þörf er á lagfæringum skal verktaki senda verkkaupa skýrslu yfir það sem þarfnast viðgerðar. Afrit af skoðunarskýrslu er fært inn á gagnagrunn Slökkviliðs höfuðborgarsvæðisins hverju sinni.';

  // BYGGINGARVÍSITALA (Agnar 11.11.2026: „Mátt finna byggingarvísitöluna og setja hana inn"). Nýjasta BIRTA gildi vísitölu
  // byggingarkostnaðar, grunnur 2021 = 100, sótt beint af PX-vef Hagstofu Íslands (tafla VIS13000; CORS opið). Sama viðmið og í
  // fyrirmyndinni: samningur dags. 15.09.2022 bar 108,3 = gildi ágústmánaðar 2022, þ.e. það sem var birt á undirritunardegi.
  // Náist ekki samband er reiturinn auður — hér er aldrei sett inn tala sem er ekki frá Hagstofu.
  const HAGSTOFA = 'https://px.hagstofa.is/pxis/api/v1/is/Efnahagur/visitolur/2_byggingarvisitala/byggingarvisitala/VIS13000.px';
  const MAN = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  let _vis = null, _visT = 0;
  async function saekjaVisitolu() {
    if (_vis && Date.now() - _visT < 6 * 3600e3) return _vis;
    try {
      // ENGINN Content-Type-haus: með „application/json" sendir vafrinn forskoðun (OPTIONS) sem Hagstofan svarar án CORS-hausa og
      // fyrirspurnin fellur („Failed to fetch", mælt 11.11.2026). Án haussins er þetta einföld beiðni og svarið kemur með ACAO: *.
      const r = await fetch(HAGSTOFA, { method: 'POST',
        body: JSON.stringify({ query: [{ code: 'Liður', selection: { filter: 'item', values: ['BCI'] } }, { code: 'Mánuður', selection: { filter: 'top', values: ['1'] } }], response: { format: 'json' } }) });
      if (!r.ok) return null;
      const j = JSON.parse((await r.text()).replace(/^﻿/, ''));
      const d = j && j.data && j.data[j.data.length - 1]; if (!d) return null;
      const lykill = (d.key || []).filter(k => /^\d{4}M\d{2}$/.test(k))[0], m = lykill && /^(\d{4})M(\d{2})$/.exec(lykill), g = parseFloat(d.values && d.values[0]);
      if (!m || !isFinite(g) || g < 50 || g > 1000) return null;   // ólíkleg tala = ekki treyst
      _vis = { gildi: g, texti: String(d.values[0]).replace('.', ','), manudur: MAN[+m[2] - 1] + ' ' + m[1], lykill: lykill }; _visT = Date.now();
      return _vis;
    } catch (_) { return null; }
  }

  // Verð úr verðlistanum (án vsk) eða null — aldrei ágiskun.
  function verdUrLista(id) {
    try {
      const l = (window.Verdlistar && Verdlistar.lidir) ? Verdlistar.lidir(LISTI) : [];
      const x = (l || []).filter(y => y.id === id)[0];
      return (x && x.verd_an_vsk != null) ? Number(x.verd_an_vsk) : null;
    } catch (_) { return null; }
  }

  function nyttForm() {
    const h = vf(), b = (h && h.branding()) || {};
    const i = h ? h.todayISO() : new Date().toISOString().slice(0, 10);
    return {
      date: i,
      customer: { nafn: '', kennitala: '', heimilisfang: '' },
      verktaki: { nafn: b.company_name || 'Slökkvitæki ehf', kennitala: b.kennitala || '', leyfi: '' },
      kerfi: 'vatnsúðakerfum', stadur: '', reglur: SJ_REGLUR,
      skodanir: [
        { heiti: 'Mánaðarleg skoðun í samræmi við reglur HMS', fjoldi: 8, af: 'eigandi', verd: null },
        { heiti: 'Ársfjórðungsskoðun', fjoldi: 4, af: 'verktaki', verd: verdUrLista('sp-q') },
        { heiti: 'Ársskoðun', fjoldi: 1, af: 'verktaki', verd: verdUrLista('sp-a') }
      ],
      akstur_a: true, akstur: verdUrLista('sp-akstur'),
      visitala_a: true, visitala_dags: i, visitala_gildi: '', visitala_man: '',   // _man: mánuður Hagstofugildis („október 2026"); autt = handslegið
      reikn: '', gr3: SJ_GR3, gildir_fra: i, uppsogn: 'þriggja mánaða', serakvaedi: '',
      // „220 Hafnarfirði" → „Hafnarfirði" (staður undirritunar; breytanlegt)
      undir: { stadur: String(b.address2 || '').replace(/^\s*\d{3}\s*/, '').trim(), kaupi: '', taki: '' }
    };
  }

  // Þóknun verktaka á ári án vsk — aðeins raðir verktaka með verði.
  function arsSumma(sk) {
    return (sk || []).reduce((s, r) => s + (r.af === 'verktaki' && r.verd != null ? (Number(r.fjoldi) || 0) * Number(r.verd) : 0), 0);
  }

  // ───────────────────────────── prentskjal ─────────────────────────────
  function html(o) {
    const h = vf(); if (!h) return '';
    const t = h.theme(), tdk = t.dark;
    const c = o.customer || {}, v = o.verktaki || {}, u = o.undir || {};
    const autt = n => '<span style="display:inline-block;min-width:' + (n || 120) + 'px;border-bottom:1px solid #334155">&nbsp;</span>';
    const eda = (s, n) => (s && String(s).trim()) ? esc(String(s).trim()) : autt(n);
    const kr = n => 'kr. ' + (n == null ? autt(70) : h.grp(n));
    const P = 'margin:0 0 9px;font-size:12.5px;line-height:1.6;color:#0f172a';
    const gr = n => '<div style="text-align:center;font-size:12.5px;font-weight:800;color:' + tdk + ';margin:16px 0 6px;break-after:avoid">' + n + '. gr.</div>';
    const p = s => '<p style="' + P + '">' + s + '</p>';

    const lidir = (o.skodanir || []).filter(r => String(r.heiti || '').trim()).map(r => {
      const n = Number(r.fjoldi) || 0;
      let s = '<b>' + esc(String(r.heiti).trim()) + '</b>' + (n ? ', ' + sinnum(n) + ' á ári' : '') + '.';
      if (r.af === 'eigandi') s += ' Framkvæmd af húseiganda.';
      else s += ' Þóknun ' + kr(r.verd) + ' án vsk.' + (n > 1 ? ' hver skoðun' + (r.verd != null ? ', samtals ' + kr(n * r.verd) + ' án vsk. á ári.' : '.') : '');
      return s;
    });
    if (o.akstur_a) lidir.push('<b>Akstur</b> við skoðun og prófun, í hvert skipti ' + kr(o.akstur) + ' án vsk.');

    const stadur = (o.stadur && o.stadur.trim()) || c.heimilisfang || '';
    const reikn = (o.reikn && o.reikn.trim()) || [c.nafn, c.heimilisfang].filter(Boolean).join(', ');
    const undirrit = (merki, nafn, felag) => '<div style="flex:1;border-top:1px solid ' + tdk + ';padding-top:6px;font-size:11px;color:#475569">' + esc(merki) +
      (nafn ? '<div style="font-size:12.5px;font-weight:700;color:#0f172a;margin-top:2px">' + esc(nafn) + '</div>' : '') +
      (felag ? '<div style="margin-top:1px">' + esc(felag) + '</div>' : '') + '</div>';

    let n = 4;
    const inner =
      '<div style="text-align:center;margin:4px 0 16px"><div style="font-size:21px;font-weight:800;letter-spacing:.02em;color:' + tdk + '">Þjónustusamningur</div>' +
        '<div style="font-size:12px;color:#475569;margin-top:3px">Þjónustueftirlit með ' + esc(o.kerfi || 'vatnsúðakerfum') + '</div>' +
        (v.leyfi ? '<div style="font-size:11px;color:#64748b;margin-top:2px">Starfsleyfi HMS nr. ' + esc(v.leyfi) + '</div>' : '') + '</div>' +
      p('Undirritaðir aðilar, <b>' + eda(c.nafn, 190) + '</b>, kt. ' + eda(c.kennitala, 90) + (c.heimilisfang ? ', ' + esc(c.heimilisfang) : '') +
        ', í samningi þessum nefndur verkkaupi, og <b>' + eda(v.nafn, 190) + '</b>, kt. ' + eda(v.kennitala, 90) +
        ', í samningi þessum nefndur verktaki, gera með sér eftirfarandi þjónustusamning.') +
      gr(1) +
      // „á eftirfarandi stað:" og „sendir á:" — orðalag sem stenst hvaða fall sem staður/nafn er slegið inn í.
      p('Verktaki tekur að sér þjónustueftirlit með ' + esc(o.kerfi || 'vatnsúðakerfum') + ' á eftirfarandi stað: <b>' + eda(stadur, 220) + '</b>. ' + esc(o.reglur || '')) +
      gr(2) +
      p('Þjónustan innifelur eftirfarandi:') +
      '<ul style="margin:0 0 9px;padding-left:20px;font-size:12.5px;line-height:1.6;color:#0f172a">' + lidir.map(s => '<li style="margin-bottom:5px">' + s + '</li>').join('') + '</ul>' +
      (o.visitala_a ? p('Þóknun er uppfærð miðað við byggingarvísitölu dags. ' + (o.visitala_dags ? esc(dags(o.visitala_dags)) : autt(80)) +
        '. Byggingarvísitala við undirskrift er ' + eda(o.visitala_gildi, 60) +
        ((o.visitala_gildi && o.visitala_man) ? ' stig (' + esc(o.visitala_man) + ', grunnur 2021 = 100)' : '') + '.') : '') +
      p('Reikningar sem eru í samræmi við ofangreint skulu sendir á: ' + eda(reikn, 240) + '.') +
      gr(3) + '<p style="' + P + ';white-space:pre-wrap">' + esc(o.gr3 || '') + '</p>' +
      gr(4) +
      p('Samningur þessi er gerður í tvíriti, sitt fyrir hvorn aðila. Samningur gildir frá og með ' + (o.gildir_fra ? esc(dags(o.gildir_fra)) : autt(80)) +
        ' og er með gagnkvæmum ' + eda(o.uppsogn, 100) + ' uppsagnarfresti.') +
      ((o.serakvaedi && o.serakvaedi.trim()) ? gr(++n) + '<p style="' + P + ';white-space:pre-wrap">' + esc(o.serakvaedi.trim()) + '</p>' : '') +
      '<div style="break-inside:avoid">' +
        '<div style="margin-top:24px;font-size:12.5px;color:#0f172a">' + [u.stadur, dags(o.date)].filter(Boolean).map(esc).join(' ') + '</div>' +
        '<div style="display:flex;justify-content:space-between;gap:44px;margin-top:58px">' +
          undirrit('F.h. verkkaupa', u.kaupi, c.nafn) + undirrit('F.h. verktaka', u.taki, v.nafn) +
        '</div></div>';
    return h.docShell('Þjónustusamningur', dags(o.date), '', inner, h.skjalNafn(['Þjónustusamningur', c.nafn, 'Vatnsúðakerfi']), '');
  }

  // ───────────────────────────── stíll formsins ─────────────────────────────
  function stilar() {
    if (document.getElementById('_ss-stil')) return;
    const M = '#_th-modal ';
    const css = [
      M + '._ss-k{margin:0 0 18px}',
      M + '._ss-k>h3{margin:0 0 9px;padding:0 0 5px;font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--th-dark,#1b1b1b);border-bottom:2px solid var(--th-tintb,#F07A1E)}',
      M + '._ss-k>h3 small{font-weight:600;letter-spacing:0;text-transform:none;color:#64748b;margin-left:8px;font-size:11.5px}',
      M + '._ss-g{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr))}',
      M + '._ss-g+._ss-g{margin-top:10px}',
      M + '._ss-allt{grid-column:1 / -1}',
      M + '._ss-2{grid-column:span 2}',
      M + '._ss-l{display:block;font-size:11px;color:#64748b;font-weight:700;min-width:0}',
      M + '._ss-l input,' + M + '._ss-l textarea,' + M + '._ss-rod input,' + M + '._ss-rod select{display:block;width:100%;margin:3px 0 0;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;font-weight:400;color:#0f172a;background:#fff;box-sizing:border-box;min-height:0;height:auto}',
      M + '._ss-l textarea{resize:vertical;line-height:1.45}',
      M + '._ss-hak{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:#334155;cursor:pointer;margin:0 0 6px}',
      M + '._ss-hak input{width:16px;height:16px;margin:0;flex:none}',
      M + '._ss-rod{display:grid;grid-template-columns:minmax(0,2.4fr) 70px 128px 116px 104px 30px;gap:6px;align-items:end;margin-bottom:6px}',
      M + '._ss-rod label{display:block;min-width:0;margin:0}',
      M + '._ss-rod label i{display:none;font-style:normal;font-size:10px;font-weight:700;color:#64748b}',
      M + '._ss-rod input,' + M + '._ss-rod select{margin:0;padding:7px 8px;font-size:12.5px}',
      M + '._ss-rod [data-f="fjoldi"],' + M + '._ss-rod [data-f="verd"]{text-align:right}',
      M + '._ss-rod [data-f="verd"]{font-weight:600;color:var(--th-primary,#C0341D);border-color:var(--th-tintb,#F07A1E)}',
      M + '._ss-rod [data-f="verd"]:disabled{background:#f1f5f9;border-color:#e2e8f0;color:#94a3b8}',
      M + '._ss-sam{align-self:center;text-align:right;font-size:12.5px;font-weight:700;color:#0f172a;white-space:nowrap;font-variant-numeric:tabular-nums}',
      M + '._ss-rh{margin-bottom:3px;align-items:center}',
      M + '._ss-rh span{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--th-dark,#1b1b1b)}',
      M + '._ss-rh span:nth-child(2),' + M + '._ss-rh span:nth-child(4),' + M + '._ss-rh span:nth-child(5){text-align:right}',
      M + '._ss-del{all:unset;box-sizing:border-box;width:28px;height:30px;border-radius:6px;background:#fef2f2;color:#dc2626;text-align:center;cursor:pointer;font-size:16px;line-height:30px;align-self:center}',
      M + '._ss-ny{all:unset;box-sizing:border-box;display:inline-block;padding:7px 12px;border:1px dashed var(--th-primary,#C0341D);border-radius:7px;background:#fff;color:var(--th-primary,#C0341D);cursor:pointer;font-size:12px;font-weight:700}',
      M + '._ss-hint{font-size:11.5px;color:#64748b;margin:0 0 9px;line-height:1.45}',
      M + '._ss-tengill{all:unset;cursor:pointer;color:var(--th-primary,#C0341D);font-size:11.5px;font-weight:700;text-decoration:underline;white-space:nowrap}',
      M + '._ss-tengill:disabled{opacity:.5;cursor:default}',
      M + '._ss-hint b{color:#b45309}',
      M + '._ss-summa{display:flex;justify-content:flex-end;margin-top:12px}',
      M + '._ss-summa>div{min-width:300px;max-width:100%}',
      M + '._ss-sr{display:flex;justify-content:space-between;gap:14px;padding:5px 0;font-size:13px;color:#475569}',
      M + '._ss-sr.t{padding:9px 0 3px;margin-top:4px;font-size:17px;font-weight:800;color:var(--th-primary,#C0341D);border-top:3px solid var(--th-dark,#1b1b1b)}',
      M + '._ss-sn{font-size:11px;color:#64748b;text-align:right}',
      '@media (max-width:700px){',
      M + '._ss-g{grid-template-columns:minmax(0,1fr)}',
      M + '._ss-2{grid-column:auto}',
      M + '._ss-rh{display:none}',
      M + '._ss-rod{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px 8px;padding:9px;margin-bottom:8px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc}',
      M + '._ss-rod label i{display:block;margin-bottom:2px}',
      M + '._ss-rod label:first-child{grid-column:1 / -1}',
      M + '._ss-sam{text-align:left;align-self:end;padding-bottom:7px}',
      M + '._ss-del{justify-self:end;align-self:end;width:40px;height:34px;line-height:34px}',
      M + '._ss-summa>div{min-width:0;width:100%}',
      '}'
    ].join('\n');
    const st = document.createElement('style'); st.id = '_ss-stil'; st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  // ───────────────────────────── formið ─────────────────────────────
  async function opna(existing) {
    const h = vf();
    if (!h) { alert('Tilboð & samningar eru ekki hlaðin — endurhladdu síðuna.'); return; }
    try { if (window.AppSettings && AppSettings.load) await AppSettings.load(); } catch (_) {}
    stilar();
    const nytt = !(existing && existing.id);
    const o = nytt ? nyttForm() : Object.assign(nyttForm(), JSON.parse(JSON.stringify(existing)));
    const c = o.customer || {}, v = o.verktaki || {}, u = o.undir || {};
    let radir = (o.skodanir || []).map(r => Object.assign({}, r));
    let breytt = false, vistar = false;

    const txt = (merki, id, gildi, ph, kl) => '<label class="_ss-l' + (kl ? ' ' + kl : '') + '">' + merki + '<input id="' + id + '" type="text" value="' + esc(gildi == null ? '' : gildi) + '" placeholder="' + esc(ph || '') + '"></label>';
    const dag = (merki, id, gildi) => '<label class="_ss-l">' + merki + '<input id="' + id + '" type="date" value="' + esc(gildi || '') + '"></label>';
    const svaedi = (merki, id, gildi, rows, ph) => '<label class="_ss-l _ss-allt">' + merki + '<textarea id="' + id + '" rows="' + rows + '" placeholder="' + esc(ph || '') + '">' + esc(gildi || '') + '</textarea></label>';
    const verdReitur = n => n == null ? '' : h.grp(n);

    const urLista = nytt && radir.concat([{ verd: o.akstur }]).some(r => r.verd != null);
    const hint = !nytt ? '' : (urLista
      ? 'Þóknun er sótt úr verðlistanum <b style="color:#0f172a">Sprinklerkerfi</b> þar sem verð er skráð. Breyttu að vild — samningurinn heldur sínum tölum.'
      : '<b>Engin verð eru enn í verðlistanum Sprinklerkerfi.</b> Fylltu þóknun inn hér, eða skildu eftir autt — þá prentast auð lína til að handfylla.');

    const body =
      '<div class="_ss">' +
      '<div class="_ss-k"><h3>Aðilar</h3>' +
        '<div class="_ss-g">' +
          txt('Verkkaupi', '_th-nafn', c.nafn, 'Nafn fyrirtækis — leitaðu hér') + txt('Kennitala verkkaupa', '_th-kt', c.kennitala, '000000-0000') + txt('Heimilisfang verkkaupa', '_th-addr', c.heimilisfang, 'Gata, póstnúmer og staður') +
        '</div><div class="_ss-g">' +
          txt('Verktaki', '_ss-vnafn', v.nafn, '') + txt('Kennitala verktaka', '_ss-vkt', v.kennitala, '000000-0000') + txt('Starfsleyfi HMS nr. (valfrjálst)', '_ss-leyfi', v.leyfi, 'Prentast aðeins ef fyllt út') +
        '</div></div>' +

      '<div class="_ss-k"><h3>1. gr. — Umfang</h3>' +
        '<div class="_ss-g">' +
          txt('Þjónustueftirlit með', '_ss-kerfi', o.kerfi, 'vatnsúðakerfum') +
          txt('Þjónustustaður', '_ss-stadur', o.stadur, 'T.d. Ármúli 5, 108 Reykjavík — autt = heimilisfang verkkaupa', '_ss-2') +
          svaedi('Reglur sem þjónustan fylgir', '_ss-reglur', o.reglur, 3, '') +
        '</div></div>' +

      '<div class="_ss-k"><h3>2. gr. — Skoðanir og þóknun <small>verð án vsk</small></h3>' +
        (hint ? '<p class="_ss-hint">' + hint + '</p>' : '') +
        '<div class="_ss-rod _ss-rh"><span>Skoðun</span><span>Á ári</span><span>Framkvæmd af</span><span>Þóknun, hver</span><span>Samtals á ári</span><span></span></div>' +
        '<div id="_ss-radir"></div>' +
        '<button type="button" class="_ss-ny" id="_ss-ny">+ Bæta við skoðun</button>' +
        '<div class="_ss-g" style="margin-top:14px">' +
          '<div><label class="_ss-hak"><input type="checkbox" id="_ss-akstur-a"' + (o.akstur_a ? ' checked' : '') + '> Akstur rukkaður í hvert skipti</label>' +
            '<label class="_ss-l">Akstur, hver ferð (án vsk)<input id="_ss-akstur" type="text" inputmode="numeric" value="' + esc(verdReitur(o.akstur)) + '" placeholder="kr"></label></div>' +
          '<div class="_ss-2"><label class="_ss-hak"><input type="checkbox" id="_ss-visit-a"' + (o.visitala_a ? ' checked' : '') + '> Þóknun fylgir byggingarvísitölu</label>' +
            '<div class="_ss-g" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + dag('Grunndagsetning vísitölu', '_ss-visit-d', o.visitala_dags) + txt('Byggingarvísitala við undirskrift', '_ss-visit-g', o.visitala_gildi, 'stig — autt = auð lína') + '</div>' +
            '<p class="_ss-hint" style="margin:6px 0 0"><span id="_ss-visit-n"></span> <button type="button" class="_ss-tengill" id="_ss-visit-s">Sækja nýjustu frá Hagstofu</button></p></div>' +
          txt('Reikningar sendist á', '_ss-reikn', o.reikn, 'Autt = nafn og heimilisfang verkkaupa', '_ss-allt') +
        '</div>' +
        '<div class="_ss-summa"><div>' +
          '<div class="_ss-sr"><span>Þóknun verktaka á ári án vsk</span><span id="_ss-s-an">—</span></div>' +
          '<div class="_ss-sr"><span>VSK 24%</span><span id="_ss-s-vsk">—</span></div>' +
          '<div class="_ss-sr t"><span>Samtals m. vsk á ári</span><span id="_ss-s-tot">—</span></div>' +
          '<div class="_ss-sn" id="_ss-s-ath"></div>' +
        '</div></div></div>' +

      '<div class="_ss-k"><h3>3. gr. — Lagfæringar og skýrsluskil</h3><div class="_ss-g">' + svaedi('Texti greinarinnar', '_ss-gr3', o.gr3, 3, '') + '</div></div>' +

      '<div class="_ss-k"><h3>4. gr. — Gildistími og uppsögn</h3><div class="_ss-g">' +
        dag('Gildir frá og með', '_ss-fra', o.gildir_fra) + txt('Uppsagnarfrestur (gagnkvæmur)', '_ss-upps', o.uppsogn, 'þriggja mánaða') +
        svaedi('Sérákvæði (valfrjálst — prentast sem 5. gr.)', '_ss-ser', o.serakvaedi, 2, 'T.d. hvað fellur utan samnings, viðbragðstími, tengiliðir…') +
      '</div></div>' +

      '<div class="_ss-k" style="margin-bottom:0"><h3>Undirritun</h3><div class="_ss-g">' +
        txt('Staður', '_ss-ustadur', u.stadur, 'T.d. Hafnarfirði') + dag('Dagsetning', '_th-date', o.date) + '<span></span>' +
        txt('Undirritar f.h. verkkaupa (valfrjálst)', '_ss-ukaupi', u.kaupi, 'Nafn') + txt('Undirritar f.h. verktaka (valfrjálst)', '_ss-utaki', u.taki, 'Nafn') +
      '</div></div>' +
      '</div>';

    const m = h.modal('💦 Þjónustusamningur — vatnsúðakerfi' + (nytt ? '' : ' <span style="font-size:12px;color:#fbbf24;font-weight:400">· breyti</span>'), body, h.footBtns);
    const ov = m.ov, R = ov.querySelector('#_ss-radir');
    const g = id => ov.querySelector('#' + id);
    const gildi = id => ((g(id) || {}).value || '').trim();
    // Tómur reitur = ekkert verð (null), ekki 0 kr.
    const verdEdaNull = s => { const t = String(s == null ? '' : s).trim(); return t === '' ? null : h.pn(t); };

    function rodHtml(r, i) {
      const eig = r.af === 'eigandi';
      return '<div class="_ss-rod" data-i="' + i + '">' +
        '<label><i>Skoðun</i><input data-f="heiti" type="text" value="' + esc(r.heiti || '') + '" placeholder="Heiti skoðunar" aria-label="Heiti skoðunar"></label>' +
        '<label><i>Skipti á ári</i><input data-f="fjoldi" type="number" min="0" step="1" value="' + esc(r.fjoldi == null ? '' : r.fjoldi) + '" aria-label="Skipti á ári"></label>' +
        '<label><i>Framkvæmd af</i><select data-f="af" aria-label="Framkvæmd af"><option value="verktaki"' + (eig ? '' : ' selected') + '>Verktaka</option><option value="eigandi"' + (eig ? ' selected' : '') + '>Húseiganda</option></select></label>' +
        '<label><i>Þóknun, hver skoðun</i><input data-f="verd" type="text" inputmode="numeric" value="' + esc(eig ? '' : verdReitur(r.verd)) + '" placeholder="' + (eig ? '—' : 'kr') + '"' + (eig ? ' disabled' : '') + ' aria-label="Þóknun án vsk, hver skoðun"></label>' +
        '<span class="_ss-sam" data-c="sam">—</span>' +
        '<button type="button" class="_ss-del" data-del aria-label="Eyða skoðun" title="Eyða skoðun">×</button>' +
      '</div>';
    }
    function safna() {
      const ut = [];
      R.querySelectorAll('._ss-rod').forEach(el => {
        const af = el.querySelector('[data-f="af"]').value === 'eigandi' ? 'eigandi' : 'verktaki';
        const fj = el.querySelector('[data-f="fjoldi"]').value;
        ut.push({ heiti: el.querySelector('[data-f="heiti"]').value.trim(), fjoldi: fj === '' ? null : Math.max(0, Math.round(h.num(fj))), af: af,
          verd: af === 'eigandi' ? null : verdEdaNull(el.querySelector('[data-f="verd"]').value) });
      });
      return ut;
    }
    function reikna() {
      const rs = safna();
      R.querySelectorAll('._ss-rod').forEach((el, i) => {
        const r = rs[i], vr = el.querySelector('[data-f="verd"]'), eig = r.af === 'eigandi';
        if (vr.disabled !== eig) { vr.disabled = eig; vr.placeholder = eig ? '—' : 'kr'; if (eig) vr.value = ''; }
        el.querySelector('[data-c="sam"]').textContent = eig ? 'húseigandi' : (r.verd != null && r.fjoldi ? h.fmtKr(r.fjoldi * r.verd) : '—');
      });
      const an = arsSumma(rs);
      g('_ss-s-an').textContent = an ? h.fmtKr(an) : '—';
      g('_ss-s-vsk').textContent = an ? h.fmtKr(Math.round(an * (1 + h.VSK)) - Math.round(an)) : '—';
      g('_ss-s-tot').textContent = an ? h.fmtKr(Math.round(an * (1 + h.VSK))) : '—';
      const anV = rs.filter(r => r.af === 'verktaki' && r.heiti && r.verd == null).length;
      const ak = g('_ss-akstur-a').checked;
      g('_ss-akstur').disabled = !ak;
      g('_ss-visit-d').disabled = g('_ss-visit-g').disabled = !g('_ss-visit-a').checked;
      g('_ss-s-ath').textContent = [anV ? anV + (anV === 1 ? ' skoðun' : ' skoðanir') + ' án verðs — prentast sem auð lína' : '', ak ? 'Akstur bætist við í hvert skipti' : ''].filter(Boolean).join(' · ');
    }
    function teikna() { R.innerHTML = radir.map(rodHtml).join(''); reikna(); }

    // ── byggingarvísitala: nýtt form sækir nýjasta gildi sjálft EF reiturinn er auður; vistað eða handslegið gildi er aldrei yfirskrifað
    //    nema ýtt sé á „Sækja nýjustu frá Hagstofu". Handsláttur hreinsar mánuðinn (þá er ekki fullyrt hvaðan talan er).
    let visMan = o.visitala_man || '';
    const visNota = t => { const n = g('_ss-visit-n'); if (n) n.textContent = t; };
    const visStada = () => visNota(visMan && gildi('_ss-visit-g') ? 'Gildi Hagstofu Íslands fyrir ' + visMan + ' (grunnur 2021 = 100).' : gildi('_ss-visit-g') ? 'Handslegið gildi.' : 'Autt — prentast sem auð lína.');
    async function visSaekja(yfirskrifa) {
      const hn = g('_ss-visit-s'), inn = g('_ss-visit-g'); if (!hn || !inn) return;
      hn.disabled = true; visNota('Sæki byggingarvísitölu frá Hagstofu…');
      const v = await saekjaVisitolu();
      if (!ov.isConnected) return;
      hn.disabled = false;
      if (!v) { visNota('Náði ekki sambandi við Hagstofu — sláðu gildið inn eða reyndu aftur.'); return; }
      if (yfirskrifa || !inn.value.trim()) {
        inn.value = v.texti; visMan = v.manudur;
        if (yfirskrifa) breytt = true; else inn.defaultValue = v.texti;   // sjálfsótt gildi á nýju formi telst ekki óvistuð breyting (177)
      }
      visStada();
    }
    g('_ss-visit-s').onclick = () => visSaekja(true);
    g('_ss-visit-g').addEventListener('input', () => { visMan = ''; visStada(); });
    visStada();
    if (nytt && o.visitala_a) visSaekja(false);

    ov.addEventListener('input', () => { breytt = true; reikna(); });
    ov.addEventListener('change', () => { breytt = true; reikna(); });
    ov.addEventListener('blur', e => {
      const t = e.target; if (!t || !t.matches) return;
      if (t.matches('[data-f="verd"]') || t.id === '_ss-akstur') { const n = verdEdaNull(t.value); t.value = n == null ? '' : h.grp(n); }
    }, true);
    R.addEventListener('click', e => {
      const b = e.target.closest('[data-del]'); if (!b) return;
      radir = safna(); radir.splice(+b.closest('._ss-rod').dataset.i, 1); breytt = true; teikna();
    });
    g('_ss-ny').onclick = () => {
      radir = safna(); radir.push({ heiti: '', fjoldi: 1, af: 'verktaki', verd: null }); breytt = true; teikna();
      const s = R.querySelectorAll('._ss-rod'); const inn = s.length && s[s.length - 1].querySelector('[data-f="heiti"]'); if (inn) inn.focus();
    };
    // × og „Loka" mega ekki henda útfylltum samningi þegjandi. Smell UTAN gluggans ver 177 (modal-dirty-guard) nú þegar —
    // hér er honum sleppt svo ekki sé spurt tvisvar.
    ov.addEventListener('click', e => {
      const x = e.target.closest && e.target.closest('#_th-x, #_th-cancel');
      if (x && breytt && !confirm('Loka án þess að vista samninginn?')) { e.stopImmediatePropagation(); e.preventDefault(); }
    }, true);
    teikna();

    function smida() {
      const rs = safna().filter(r => r.heiti || r.verd != null);
      const an = arsSumma(rs), nu = new Date().toISOString();
      return {
        id: o.id || ('P' + Date.now()), type: TEG, created_at: o.created_at || nu, updated_at: nu,
        date: g('_th-date').value || h.todayISO(),
        customer: { nafn: gildi('_th-nafn'), kennitala: gildi('_th-kt'), heimilisfang: gildi('_th-addr') },
        verktaki: { nafn: gildi('_ss-vnafn'), kennitala: gildi('_ss-vkt'), leyfi: gildi('_ss-leyfi') },
        kerfi: gildi('_ss-kerfi') || 'vatnsúðakerfum', stadur: gildi('_ss-stadur'), reglur: gildi('_ss-reglur'),
        skodanir: rs,
        akstur_a: g('_ss-akstur-a').checked, akstur: verdEdaNull(g('_ss-akstur').value),
        visitala_a: g('_ss-visit-a').checked, visitala_dags: g('_ss-visit-d').value, visitala_gildi: gildi('_ss-visit-g'), visitala_man: gildi('_ss-visit-g') ? visMan : '',
        reikn: gildi('_ss-reikn'), gr3: gildi('_ss-gr3'), gildir_fra: g('_ss-fra').value, uppsogn: gildi('_ss-upps'), serakvaedi: gildi('_ss-ser'),
        undir: { stadur: gildi('_ss-ustadur'), kaupi: gildi('_ss-ukaupi'), taki: gildi('_ss-utaki') },
        an_vsk: Math.round(an), vsk: Math.round(an * (1 + h.VSK)) - Math.round(an), m_vsk: Math.round(an * (1 + h.VSK))
      };
    }
    g('_th-print').onclick = () => h.printDoc(html(smida()));
    g('_th-save').onclick = async () => {
      if (vistar) return;
      vistar = true; const hn = g('_th-save'); hn.disabled = true;
      try {
        const f = smida();
        const arr = h.getHub(); const i = arr.findIndex(x => x.id === f.id); if (i >= 0) arr[i] = f; else arr.unshift(f);
        const ok = await h.saveHub(arr);
        if (ok === false) { h.toast('Vistun tókst ekki — reyndu aftur'); return; }
        breytt = false; m.close();
        try { window.TilbodHub.render(); } catch (_) {}
        h.toast(f.customer.nafn ? '✓ Samningur vistaður — sjá Tilboð & samningar › Vistuð form' : '✓ Vistað ÁN nafns verkkaupa — bættu því við áður en samningurinn er prentaður');
      } finally { vistar = false; if (hn.isConnected) hn.disabled = false; }
    };
  }

  // ───────────────────────────── skráning ─────────────────────────────
  let _skrad = false, _tilr = 0;
  function skra() {
    if (_skrad) return;
    const T = window.TilbodHub;
    if (!T || !T.skra || !T.vf) { if (_tilr++ < 40) setTimeout(skra, 300); return; }
    _skrad = true;
    T.skra(TEG, {
      label: 'Sprinkler-samningur', stutt: 'Samningar', plata: 'gull', flokkur: 'samningur',
      takki: 'Sprinkler-samningur', titill: 'Þjónustusamningur um eftirlit með vatnsúðakerfi (sprinkler) — útfyllanlegt form',
      opna: opna, html: html,
      undir: f => 'Vatnsúðakerfi' + ((f.stadur || (f.customer && f.customer.heimilisfang)) ? ' · ' + (f.stadur || f.customer.heimilisfang) : '')
    });
    try {
      if (window.Verdlistar && Verdlistar.hausTakki) Verdlistar.hausTakki(LISTI, { texti: '📜 Þjónustusamningur', titill: 'Útfyllanlegur þjónustusamningur um eftirlit með vatnsúðakerfi — sækir verð úr þessum lista', smellur: () => opna() });
    } catch (_) {}
  }
  skra();

  window.SprinklerSamningur = { opna: opna, html: html, tegund: TEG };
})();
