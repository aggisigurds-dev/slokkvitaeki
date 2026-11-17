#!/usr/bin/env node
/* Vörður — Payday: minni á höfnun rafræns reiknings + varanetfang sem TILLAGA (lota 9, 17.11.2026).
 *
 * Það sem gerðist: payday-push.cjs þvingaði createElectronicInvoice=true á HVERJA sendingu og mundi ekki höfnun.
 * Kúnni sem Payday segir „does not accept electronic invoices" um fékk því nýja höfnun og nýtt borðmál við hverja
 * sendingu (Óðins regla #10 lokaði 24 af 26 slíkum). Og vantaði netfang fór aðeins krafa í banka — hvorki reikningur
 * né skýrsla (#1646) — án þess að sendiskjárinn segði það fyrirfram.
 *
 * Keyrir handler payday-push á HERMDU neti (Supabase + Payday svara úr gervigögnum; ekkert raunkall). RAUTT ef:
 *   1) kt án minnis fær EKKI rafræna tilraun (gamla hegðunin brotin),
 *   2) kt í minni fær samt XML-tilraun, eða nýtt borðmál / app_problems, eða svarið ber ekki rafraent_sleppt,
 *   3) kt í minni og netfang til → pósturinn fer ekki (sendEmail), eða afhending er ekki 'email',
 *   4) ný höfnun („does not accept") skráist ekki í minnið (RPC payday_muna_rafraent_hafnad með kt), eða önnur
 *      XML-villa skráist í minnið, eða varaleiðin (reikningur án XML + eitt borðmál) hætti að virka,
 *   5) force_electronic:true sleppir XML þrátt fyrir minni,
 *   6) bilun í lestri minnis fellir sendingu eða sleppir XML (minnið er viðbót),
 *   7) dry-svar án netfangs ber ekki bokhald@<lén> sem ágiskun (agiskun:true), eða stingur upp á ókeypis
 *      póstþjónustu / léni umsjónarfélags (3+ kt), eða Payday er kallað í dry,
 *   8) tillagan rati í payload/sendingu án email_override (aldrei sjálfkrafa), eða email_override sé hunsað,
 *   9) 166: tillöguhakið sé á sjálfgefið, email_override fari út án haks, eða breytilegur texti fari án esc().
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const brot = [];
const KT_MINNI = '0101012390';     // gervikennitölur — engin raungögn
const KT_NYR = '0202022390';
const KT_ANNAD = '0303032390';
const API = 'https://payday.gervi';
const SB = 'https://gervi.supabase.co';

function svar(status, body) {
  const t = typeof body === 'string' ? body : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, json: async () => JSON.parse(t), text: async () => t };
}

function smidaNet(st) {
  // st: { sala, netfang, minni:{kt:row}|'villa', hafna:'does not accept'|'annad'|null, kontaktar:[...], lenKts:{len:n} }
  const log = [];
  const net = async (url, opt) => {
    url = String(url); opt = opt || {};
    const m = (opt.method || 'GET').toUpperCase();
    let body = null; try { body = opt.body && typeof opt.body === 'string' ? JSON.parse(opt.body) : null; } catch (_) {}
    if (opt.body && typeof opt.body !== 'string' && typeof opt.body.get === 'function') {
      try { body = JSON.parse(opt.body.get('data')); } catch (_) {}
    }
    log.push({ url, m, body });
    if (url.startsWith(API)) {
      if (url.includes('/customers?ssn=')) return svar(200, []);
      if (url.endsWith('/customers') && m === 'POST') return svar(200, { id: 'pd-kunni-1', ssn: body && body.ssn });
      if (url.includes('/invoices') && m === 'POST') {
        if (body && body.createElectronicInvoice && st.hafna) {
          return svar(400, st.hafna === 'does not accept' ? 'Customer does not accept electronic invoices' : 'electronic invoice XML schema invalid');
        }
        return svar(200, { id: 'pd-inv-1', number: 777 });
      }
      return svar(200, {});
    }
    if (url.includes('/rest/v1/app_kv')) return svar(200, m === 'GET' ? [{ value: { access_token: 'gervi', exp_ts: Date.now() + 1e8 } }] : {});
    if (url.includes('/rest/v1/solur?id=eq.') && m === 'GET') return svar(200, [st.sala]);
    if (url.includes('/rest/v1/solur') && m === 'PATCH') return svar(200, [{ id: st.sala.id }]);
    if (url.includes('/rest/v1/solur')) return svar(200, []);
    if (url.includes('/rest/v1/customers_base')) return svar(200, [{ id: 5, nafn: 'Gervifélag ehf', kennitala: st.sala.customer_kt, netfang: st.netfang || null }]);
    if (url.includes('/rest/v1/fyrirtaeki')) return svar(200, [{ id: 9, nafn: 'Gervifélag ehf', kennitala: st.sala.customer_kt, netfang: null, heimilisfang: 'Gervigata 1' }]);
    if (url.includes('/rest/v1/payday_rafraent_hafnad')) {
      if (st.minni === 'villa') return svar(500, { message: 'gervibilun' });
      const kt = (/kt=eq\.(\d+)/.exec(url) || [])[1];
      const r = st.minni && st.minni[kt];
      return svar(200, r ? [r] : []);
    }
    if (url.includes('/rest/v1/rpc/payday_muna_rafraent_hafnad')) return svar(204, '');
    if (url.includes('/rest/v1/charlize_contacts')) {
      const lenM = /len=eq\.([^&]+)/.exec(url);
      if (lenM) {
        const len = decodeURIComponent(lenM[1]);
        const n = (st.lenKts && st.lenKts[len]) || 1;
        return svar(200, Array.from({ length: n }, (_, i) => ({ kennitala: '01010' + (10000 + i) })));
      }
      return svar(200, st.kontaktar || []);
    }
    if (url.includes('/rest/v1/thjonustubeidni') && m === 'GET') return svar(200, []);
    if (url.includes('/rest/v1/thjonustubeidni')) return svar(201, [{ id: 4242 }]);
    if (url.includes('/rest/v1/app_problems') && m === 'GET') return svar(200, []);
    if (url.includes('/rest/v1/app_problems')) return svar(201, '');
    return svar(200, []);
  };
  return { net, log };
}

function hlada() {
  Object.assign(process.env, {
    SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: 'gervi', PAYDAY_CLIENT_ID: 'gervi', PAYDAY_CLIENT_SECRET: 'gervi',
    PAYDAY_API_BASE: API,
  });
  delete process.env.EDGE_SHARED_KEY;
  // Lota 13 (17.11.2026): payday-push krefst innskráðs starfsmanns. Notendaskráin (hub-adgangar GET) er hermd: kaka → inni.
  const HUB = require(path.join(ROT, 'netlify/functions/hub-adgangar.cjs'));
  HUB.handler = async (e) => ({ statusCode: 200, body: JSON.stringify(/hub_user=/.test(String((e.headers || {}).cookie || '')) ? { authed: true, user: { nafn: 'Prufa', rola: 'Starfsmaður' } } : { authed: false, user: null }) });
  const f = path.join(ROT, 'netlify/functions/payday-push.cjs');
  delete require.cache[require.resolve(f)];
  return require(f);
}

function sala(kt) {
  return {
    id: 91001, num: 'R-GERVI-1', customer_kt: kt, customer_nafn: 'Gervifélag ehf', customer_base_id: 5, customer_id: 9,
    samtals: 12400, status: 'final', source: 'pos', created_at: new Date().toISOString(),
    linur: [{ nafn: 'Hleðsla', magn: 1, verd: 10000 }],
  };
}

async function keyra(nafn, st, bodyAuka) {
  const { net, log } = smidaNet(st);
  globalThis.fetch = net;
  const mod = hlada();
  const res = await mod.handler({ httpMethod: 'POST', headers: { cookie: 'hub_user=prufa' }, body: JSON.stringify(Object.assign({ sale_id: st.sala.id, attach_report: false }, bodyAuka || {})) });
  let j = {}; try { j = JSON.parse(res.body); } catch (_) {}
  const reikningar = log.filter(x => x.url.startsWith(API) && x.url.includes('/invoices') && x.m === 'POST');
  return { nafn, res, j, log, reikningar,
    mal: log.filter(x => x.url.includes('/rest/v1/thjonustubeidni') && x.m === 'POST'),
    villur: log.filter(x => x.url.includes('/rest/v1/app_problems') && x.m === 'POST'),
    minnisSkrif: log.filter(x => x.url.includes('/rpc/payday_muna_rafraent_hafnad')),
    payday: log.filter(x => x.url.startsWith(API)) };
}

const minniRod = { fyrst_hafnad_at: '2026-09-14T10:00:00Z', sidast_hafnad_at: '2026-09-14T10:00:00Z', fjoldi: 1 };

(async () => {
  const upprFetch = globalThis.fetch;
  try {
    // 1) Án minnis: rafrænt reynt eins og áður.
    let r = await keyra('án minnis', { sala: sala(KT_NYR), netfang: 'bokhald@gervifelag.is', minni: {} });
    if (r.res.statusCode !== 200) brot.push('1) án minnis: sending féll (' + r.res.statusCode + ' ' + (r.j.error || '') + ')');
    if (!r.reikningar[0] || r.reikningar[0].body.createElectronicInvoice !== true) brot.push('1) kt án minnis fær ekki rafræna tilraun (createElectronicInvoice !== true)');
    if (r.j.rafraent_sleppt) brot.push('1) rafraent_sleppt sett án minnis');
    if (r.minnisSkrif.length) brot.push('1) minnið skrifað án höfnunar');

    // 2+3) Kt í minni, netfang til: engin XML-tilraun, póstur fer, ekkert mál.
    r = await keyra('í minni + netfang', { sala: sala(KT_MINNI), netfang: 'bokhald@gervifelag.is', minni: { [KT_MINNI]: minniRod }, hafna: 'does not accept' });
    if (r.res.statusCode !== 200) brot.push('2) í minni: sending féll (' + r.res.statusCode + ')');
    if (r.reikningar.length !== 1) brot.push('2) í minni: ' + r.reikningar.length + ' reikningsköll (átti að vera 1, án XML)');
    if (r.reikningar.some(x => x.body.createElectronicInvoice)) brot.push('2) kt í minni fær samt XML-tilraun');
    if (r.mal.length) brot.push('2) kt í minni stofnar samt borðmál (' + r.mal.length + ')');
    if (r.villur.length) brot.push('2) kt í minni skráir samt app_problems');
    if (!r.j.rafraent_sleppt || r.j.rafraent_sleppt.hafnad_fyrst !== minniRod.fyrst_hafnad_at) brot.push('2) svarið ber ekki rafraent_sleppt með dagsetningu fyrstu höfnunar');
    if (!r.reikningar[0] || r.reikningar[0].body.sendEmail !== true) brot.push('3) kt í minni + netfang: pósturinn fer ekki (sendEmail !== true)');
    if (r.j.delivery !== 'email') brot.push("3) afhending er '" + r.j.delivery + "', átti að vera 'email'");

    // 3b) Kt í minni, ekkert netfang: aðeins krafa, ekkert mál.
    r = await keyra('í minni án netfangs', { sala: sala(KT_MINNI), netfang: null, minni: { [KT_MINNI]: minniRod } });
    if (r.j.delivery !== 'none') brot.push("3b) í minni án netfangs: afhending '" + r.j.delivery + "', átti að vera 'none'");
    if (r.mal.length) brot.push('3b) í minni án netfangs stofnar borðmál');

    // 4) Ný höfnun: skráist í minnið með kt; varaleiðin óbreytt (reikningur án XML + eitt mál).
    r = await keyra('ný höfnun', { sala: sala(KT_NYR), netfang: 'bokhald@gervifelag.is', minni: {}, hafna: 'does not accept' });
    if (r.res.statusCode !== 200 || !r.j.fellBackToNonElectronic) brot.push('4) varaleiðin brotin: ' + r.res.statusCode + ' fellBack=' + r.j.fellBackToNonElectronic);
    if (r.reikningar.length !== 2 || !r.reikningar[0].body.createElectronicInvoice || r.reikningar[1].body.createElectronicInvoice) brot.push('4) röð reikningskalla er ekki [XML, án XML]');
    if (r.minnisSkrif.length !== 1 || !r.minnisSkrif[0].body || r.minnisSkrif[0].body.p_kt !== KT_NYR) brot.push('4) höfnunin skráist ekki í minnið með kt (RPC payday_muna_rafraent_hafnad)');
    if (r.minnisSkrif[0] && /\d{6}-?\d{4}/.test(String(r.minnisSkrif[0].body.p_villa || ''))) brot.push('4) kt í villutexta minnisins');
    if (r.mal.length !== 1) brot.push('4) varaleiðin stofnar ' + r.mal.length + ' mál (átti að vera 1 — óbreytt hegðun við fyrstu höfnun)');
    r = await keyra('önnur XML-villa', { sala: sala(KT_NYR), netfang: 'bokhald@gervifelag.is', minni: {}, hafna: 'annad' });
    if (r.minnisSkrif.length) brot.push('4) XML-villa sem er EKKI „does not accept" skráist í minnið');

    // 5) force_electronic: XML reynt þrátt fyrir minni.
    r = await keyra('force', { sala: sala(KT_MINNI), netfang: 'bokhald@gervifelag.is', minni: { [KT_MINNI]: minniRod } }, { force_electronic: true });
    if (!r.reikningar[0] || r.reikningar[0].body.createElectronicInvoice !== true) brot.push('5) force_electronic sleppir XML þrátt fyrir minni');

    // 6) Minnið bilar: sending heldur áfram og XML er reynt.
    r = await keyra('minni bilar', { sala: sala(KT_MINNI), netfang: 'bokhald@gervifelag.is', minni: 'villa' });
    if (r.res.statusCode !== 200) brot.push('6) bilun í minni fellir sendingu (' + r.res.statusCode + ')');
    if (!r.reikningar[0] || r.reikningar[0].body.createElectronicInvoice !== true) brot.push('6) bilun í minni sleppir XML (átti að reyna eins og áður)');

    // 7) Dry án netfangs: tillaga bokhald@<lén>, ágiskun, Payday ekki kallað.
    r = await keyra('dry tillaga', { sala: sala(KT_ANNAD), netfang: null, minni: {}, kontaktar: [
      { len: 'gmail.com', status: 'approved', faerslur: 40 },
      { len: 'umsjon-gervi.is', status: 'approved', faerslur: 30 },
      { len: 'gervifelag.is', status: 'pending', faerslur: 3 },
    ], lenKts: { 'umsjon-gervi.is': 12, 'gervifelag.is': 1 } }, { dry: true });
    const t = r.j.netfang_tillaga;
    if (!t || t.netfang !== 'bokhald@gervifelag.is' || t.agiskun !== true) brot.push('7) dry án netfangs: tillagan er ' + JSON.stringify(t) + ' (átti bokhald@gervifelag.is, agiskun:true)');
    if (r.payday.length) brot.push('7) dry kallar Payday (' + r.payday.length + ' köll)');
    if (r.j.has_email !== false) brot.push('7) dry ber ekki has_email:false');
    if (r.j.payload && r.j.payload.customer && r.j.payload.customer.email) brot.push('8) tillagan rataði í payload án staðfestingar');
    r = await keyra('dry bara almennt', { sala: sala(KT_ANNAD), netfang: null, minni: {}, kontaktar: [{ len: 'simnet.is', status: 'approved', faerslur: 9 }, { len: 'umsjon-gervi.is', status: 'approved', faerslur: 9 }], lenKts: { 'umsjon-gervi.is': 3 } }, { dry: true });
    if (r.j.netfang_tillaga) brot.push('7) stungið upp á ókeypis póstþjónustu eða umsjónarfélagi: ' + JSON.stringify(r.j.netfang_tillaga));

    // 8) Raunsending án override: ekkert netfang fer; með override: það fer í Payday-kúnnann.
    r = await keyra('án override', { sala: sala(KT_ANNAD), netfang: null, minni: {}, kontaktar: [{ len: 'gervifelag.is', status: 'approved', faerslur: 3 }] });
    const kunniAn = r.log.find(x => x.url === API + '/customers' && x.m === 'POST');
    if (kunniAn && kunniAn.body && kunniAn.body.email) brot.push('8) netfang fór í Payday án email_override: ' + kunniAn.body.email);
    r = await keyra('með override', { sala: sala(KT_ANNAD), netfang: null, minni: {} }, { email_override: 'bokhald@gervifelag.is' });
    const kunniMed = r.log.find(x => x.url === API + '/customers' && x.m === 'POST');
    if (!kunniMed || !kunniMed.body || kunniMed.body.email !== 'bokhald@gervifelag.is') brot.push('8) email_override er hunsað');
  } catch (e) {
    brot.push('keyrsla hrundi: ' + (e && e.stack || e));
  } finally {
    globalThis.fetch = upprFetch;
  }

  // 9) 166: hakið af sjálfgefið, override aðeins með haki, esc á breytilegum texta.
  const ky = fs.readFileSync(path.join(ROT, 'js/patches/166-krofu-yfirlit.js'), 'utf8').replace(/\r\n/g, '\n');
  const fall = (ky.match(/async function synaAfhendingu\([^)]*\)\s*\{[\s\S]*?\n  \}/) || [])[0] || '';
  if (!fall) brot.push('9) 166 vantar synaAfhendingu (sendiskjárinn sýnir hvorki minni né tillögu)');
  else {
    if (/_ky-send-tillaga-ok"[^>]*checked/.test(fall)) brot.push('9) tillöguhakið er á sjálfgefið — tillagan má aldrei fara sjálfkrafa');
    if (!/dry:\s*true/.test(fall)) brot.push('9) synaAfhendingu kallar ekki dry — gæti sent kröfu');
    if (!/esc\(t\.netfang\)/.test(fall) || !/esc\(t\.len/.test(fall)) brot.push('9) tillagan fer óhreinsuð (án esc) í innerHTML');
  }
  if (!/tOk\s*&&\s*tOk\.checked/.test(ky)) brot.push('9) email_override er ekki bundið við hakið (_ky-send-tillaga-ok)');
  if (!/email_override:\s*choice\.email_override\s*\|\|\s*undefined/.test(ky)) brot.push('9) sendingin í 166 ber ekki staðfesta netfangið (email_override)');

  if (brot.length) {
    console.log('❌ audit-payday-rafraent-minni: ' + brot.length + ' brot');
    brot.forEach(b => console.log('   • ' + b));
    process.exit(1);
  }
  console.log('✅ audit-payday-rafraent-minni: minni á XML-höfnun + varanetfang sem tillaga — 9 atriði græn á hermdu neti');
})();
