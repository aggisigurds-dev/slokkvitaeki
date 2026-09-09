#!/usr/bin/env node
/* VÖRÐUR: kreditfærsla verður að hanga á sínu fyrirtæki (09.09.2026).
 *
 * Agnar spurði hvað hefði orðið um Grillvagninn R-000542/543. Svarið: báðar voru
 * kreditaðar sama dag og ein leiðrétt sala (R-000548) fór í kröfu. En kreditfærslurnar
 * sjálfar — R-000549 og R-000554 — báru `customer_id = NULL` og `customer_kt = NULL`.
 * Þær fundust því ALDREI á fyrirtækinu: fyrirtækjasíðan taldi aðeins jákvæðu sölurnar
 * og sýndi 480.478 kr þar sem rétta talan var 172.033. Mínusinn var til, hann hékk bara
 * hvergi. Þetta er sama draugafærslu-mynstrið og hefur kostað mestan tíma í þessu kerfi.
 *
 * Rótin (löguð í js/patches/26-credit-invoice.js): `origSale` er mismunandi hlutur eftir
 * því hvaðan er kallað — snyrt view-model úr 00-legacy/26 en HRÁ gagnagrunnsröð úr
 * 137-verk-actions — og `customer_kt` var aldrei skrifuð. Nú eru auðkennin sótt úr
 * MÓÐURSÖLUNNI (`credit_of`), sem er alltaf til, í stað þess að treysta því sem berst.
 *
 * GRUNNLÍNA = 2. Það eru R-000572 (Rafha) og R-000667 (BGT), þar sem MÓÐIRIN sjálf ber
 * ekkert customer_id — þær þarf Agnar að para handvirkt og eru ekki lagfæranlegar
 * sjálfkrafa (nafnapörun er bönnuð: id ræður, nafn aðeins fyrir raðir með NULL fid).
 * Hver NÝ ótengd kreditfærsla er raunveruleg afturför.
 *
 * Lesandi, opinber lykill.
 */
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const BASELINE = 2;

async function sok(p) {
  const r = await fetch(SUPA + '/rest/v1/' + p, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  if (!r.ok) throw new Error(p + ' → ' + r.status + ' ' + (await r.text()).slice(0, 120));
  return r.json();
}

(async () => {
  const lausar = await sok('solur?select=id,num,samtals,customer_nafn,credit_of&is_credit=eq.true&customer_id=is.null&order=num');
  const modir = [...new Set(lausar.map(x => x.credit_of).filter(Boolean))];
  const mo = modir.length ? await sok('solur?select=id,num,customer_id&id=in.(' + modir.join(',') + ')') : [];
  const M = new Map(mo.map(x => [x.id, x]));

  // Lagfæranleg = móðirin BER customer_id. Slík má aldrei standa ótengd.
  const lagfaeranlegar = lausar.filter(x => { const m = M.get(x.credit_of); return m && m.customer_id; });
  const oleysanlegar = lausar.filter(x => !lagfaeranlegar.includes(x));

  if (lagfaeranlegar.length) {
    console.log('KREDITFÆRSLUR SEM HANGA HVERGI þótt móðursalan viti hver kúnninn er:');
    lagfaeranlegar.forEach(x => {
      const m = M.get(x.credit_of);
      console.log('   ' + String(x.num).padEnd(11) + String(x.samtals).padStart(10) + '  ' +
        String(x.customer_nafn || '—').slice(0, 28).padEnd(28) + ' móðir ' + m.num + ' → customer_id ' + m.customer_id);
    });
    console.log('\n❌ ' + lagfaeranlegar.length + ' ótengd(ar) kreditfærsla(ur) — mínusinn telst ekki með á fyrirtækinu.');
    console.log('   Sæktu customer_id/customer_kt/customer_base_id úr móðursölunni (credit_of). ALDREI para á nafni.');
    process.exit(1);
  }

  if (oleysanlegar.length > BASELINE) {
    console.log('NÝJAR ÓLEYSANLEGAR (móðirin sjálf er án customer_id):');
    oleysanlegar.forEach(x => console.log('   ' + String(x.num).padEnd(11) + String(x.samtals).padStart(10) + '  ' + (x.customer_nafn || '—')));
    console.log('\n❌ ' + oleysanlegar.length + ' > grunnlína ' + BASELINE + ' — ný ótengd sala komin inn.');
    process.exit(1);
  }

  console.log('✅ GRÆNT kredit-tenging: allar kreditfærslur hanga á sínu fyrirtæki (' +
    oleysanlegar.length + ' bíða handvirkrar pörunar, grunnlína ' + BASELINE + ').');
})().catch(e => { console.error('❌ audit-kredit-tenging villa: ' + e.message); process.exit(1); });
