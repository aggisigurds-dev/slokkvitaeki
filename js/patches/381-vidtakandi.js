/* === VIÐTAKANDI PÓSTS — TENGILIÐUR HÚSSINS FYRST (381, 2026-09-18) ===
 *
 * Agnar 18.09.2026: „ef finnast tengiliðir á öðrum en eignaumsjón þá skal notast frekar við það til að
 * senda reikninga og þannig og skýrslur" · „láta þeirra pósta vera fyrsta … og senda á þá" ·
 * „Eignaumsjón vill ekki fá tölvupósta, bara rafrænu skjölin á heimabankann".
 *
 * Húsfélög í umsjón bera netfang UMSJÓNARAÐILANS á prófílnum (reikningar@eignaumsjon.is …). Þangað fór
 * því skýrslupósturinn — eða hvergi. Reglan, í þessari röð:
 *   1. SAMÞYKKTUR tengiliður hússins sjálfs (v_charlize_contacts_active á kennitöluna) sem er hvorki á
 *      umsjónarléni (umsjonar_len) né merktur umsjónaraðili — sá sem skrifaði síðast er fyrstur.
 *   2. Netfang prófílsins — NEMA lén þess sé umsjónarlén með enginn_postur=true (Eignaumsjón): þá er
 *      ENGINN viðtakandi settur og ástæðan sögð; rafræna krafan fer sína leið í heimabankann óháð þessu.
 *   3. Netfang prófílsins eins og áður.
 *
 * Þetta fyllir AÐEINS viðtakandareitinn í póstglugganum (ReceiptSender.compose) — Agnar sér hann og
 * getur breytt áður en sent er. Snertir ekki Payday-útsendinguna (10/233/254) né payday_delivery.
 */
(() => {
  if (window.Vidtakandi) return;
  const tolur = (s) => String(s || '').replace(/\D/g, '');
  const lenAf = (n) => String(n || '').toLowerCase().trim().split('@')[1] || '';
  let _len = null;   // Map lén → { enginn_postur, athugasemd }

  async function umsjonarLen() {
    if (_len) return _len;
    const sb = window.DB && DB.sb;
    const m = new Map();
    try {
      const r = await sb.from('umsjonar_len').select('len,athugasemd,enginn_postur');
      (r.data || []).forEach((x) => m.set(String(x.len).toLowerCase(), x));
    } catch (_) {}
    if (m.size) _len = m;
    return m;
  }

  async function fyrir(o) {
    o = o || {};
    const sb = window.DB && DB.sb;
    let kt = tolur(o.kt), profilNetfang = String(o.netfang || '').trim();
    if (sb && o.coId && (!kt || !profilNetfang)) {
      try { const r = await sb.from('fyrirtaeki').select('kennitala,netfang').eq('id', o.coId).maybeSingle(); if (r && r.data) { kt = kt || tolur(r.data.kennitala); profilNetfang = profilNetfang || String(r.data.netfang || '').trim(); } } catch (_) {}
    }
    const len = await umsjonarLen();
    const erUmsjon = (n) => len.has(lenAf(n));
    // 1. tengiliður hússins sjálfs
    if (sb && kt.length === 10 && kt !== '9999999999') {
      try {
        const dd = kt.slice(0, 6) + '-' + kt.slice(6);
        const r = await sb.from('v_charlize_contacts_active').select('netfang,len,hlutverk,sidast_sest,faerslur').or('kennitala.eq.' + kt + ',kennitala.eq.' + dd);
        const hus = (r.data || []).filter((c) => c.netfang && /@/.test(c.netfang) && !erUmsjon(c.netfang) && !/umsj/i.test(c.hlutverk || '')
          && !/(eldklar\.is|brunaholf\.is|payday\.is|no-?reply)/i.test(c.netfang))
          .sort((a, b) => String(b.sidast_sest || '').localeCompare(String(a.sidast_sest || '')) || (b.faerslur || 0) - (a.faerslur || 0));
        if (hus.length) {
          const um = erUmsjon(profilNetfang) ? (len.get(lenAf(profilNetfang)).athugasemd || lenAf(profilNetfang)) : '';
          return { to: hus[0].netfang, adrir: hus.slice(1).map((c) => c.netfang), heimild: 'tengilidur',
            skyring: 'Tengiliður hússins sjálfs' + (um ? ' — umsjónaraðilinn (' + um + ') fær ekki þennan póst' : '') };
        }
      } catch (_) {}
    }
    // 2. umsjónaraðili sem vill engan póst
    if (profilNetfang && erUmsjon(profilNetfang) && len.get(lenAf(profilNetfang)).enginn_postur) {
      const um = len.get(lenAf(profilNetfang)).athugasemd || lenAf(profilNetfang);
      return { to: '', adrir: [], heimild: 'enginn',
        skyring: um + ' vill ekki tölvupóst — aðeins rafræn skjöl í heimabanka. Enginn tengiliður hússins er skráður; sláðu inn netfang ef pósturinn á að fara eitthvert.' };
    }
    // 3. eins og áður
    return { to: profilNetfang, adrir: [], heimild: 'profill', skyring: '' };
  }

  window.Vidtakandi = { fyrir, umsjonarLen };
  console.log('[patch-381] Viðtakandi: tengiliður hússins fyrst, umsjónaraðili með enginn_postur fær engan póst');
})();
/* === END VIÐTAKANDI === */
