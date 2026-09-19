/* === REIKNINGSBEIÐNIR — LJÓSIÐ (380) =========================================
 *
 * Agnar 19.09.2026:
 *   „the big boss hringir alltaf i mig þegar hann ser nýja pósta sem er ekki buid
 *    ad svara. Er hægt ađ setja þad þannig upp ad ég sjái nýjar beiđnir sem fyrst.
 *    Ljos i simaappinu td svo eg geti opnad sed postinn valid reikninginn beint
 *    þađan og sent"
 *
 * ENGIN NÝ SÍÐA. Hún er til: 📧 Reikninga-póstur (patch 240, `#reikninga-postur`)
 * les hólfin, tengir hvern póst við kúnna og reikning og hefur ✉️ Senda (velur
 * reikning, býr til PDF, sendir) og 🤖 Svar. Hún er þegar flipi í síma-appinu
 * „Þjónustuborð" (261: defaults ['bord','verkbord','arsskodun','reikninga-postur']).
 *
 * Tvennt vantaði, og hvorugt var síðan:
 *
 *   1. HÓLFIÐ SÁST EKKI. RLS-reglan `beidnir_anon_read_eldklar` hleypti aðeins
 *      account = 'eldklar@eldklar.is' í gegn til anon. Patch 240 biður um BÆÐI
 *      hólfin og fékk `bokhald@eldklar.is` TÓMT — án villu. 137 skeyti, 95 í
 *      innhólfi síðustu 60 daga, sáust aldrei. Lagað 19.09.2026 með reglunni
 *      `beidnir_anon_read_bokhald_fra_folki`, sem hleypir aðeins innhólfi frá
 *      MANNESKJUM í gegn (Teya, Nova, inExchange, Google, Stólpi, konto, inkasso
 *      og persónulega Gmail-ið haldast lokuð — 110 af 137).
 *
 *   2. EKKERT SAGÐI FRÁ. Maður þurfti að opna flipann til að vita hvort eitthvað
 *      biði. Þess vegna hringdi The Big Boss.
 *
 * Þessi skrá er (2): ljós á flipann. Talan er FJÖLDI ÓSVARAÐRA REIKNINGSBEIÐNA —
 * ekki allur ósvaraður póstur, því 81 ósvarað segir ekkert. Rautt ef eitthvað er
 * eldra en sólarhringur, gult annars.
 *
 * Heiðarleiki: náist talan ekki er EKKERT ljós sýnt (ekki núll). Núll á að þýða
 * „ekkert bíður", aldrei „ég veit það ekki".
 *
 * Opinbert API: window.ReikningsbeidnaLjos = { uppfaera, tala }.
 * ========================================================================== */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__rbLjosInstalled) return;
  window.__rbLjosInstalled = true;

  const NAV_KEY = 'reikninga-postur';
  const HOLF = ['eldklar@eldklar.is', 'bokhald@eldklar.is'];
  const DAGAR = 60;                 // sami gluggi og patch 240 notar
  const PULS_MS = 4 * 60 * 1000;    // ein létt fyrirspurn á 4 mín
  const NYTT_MS = 24 * 60 * 60 * 1000;

  // Sama regla og TAG_CATALOG í 240 notar fyrir „🧾 Reikningsbeiðni". Haldist þær
  // í hendur: breytist önnur þarf hin að fylgja, annars segir ljósið aðra tölu en
  // listinn sýnir.
  const BEIDNI = /(senda|sent|sendið|sendu|fá|fæ|vantar|afrit).{0,22}(reikning|kröfu|kvittun)|reikning.{0,22}(afrit|vantar|sent|sendan)|afrit af reikning|copy of (the )?invoice|send.{0,15}invoice/;

  // `DB.sb` verður til á DOMContentLoaded — aldrei grípa hann við hleðslu.
  const sb = () => (window.DB && window.DB.sb) || null;

  let _tala = null;      // null = ómælt. Ekki sama og 0.
  let _elsta = null;
  let _bid = false;

  // 19.09.2026: `DB.sb` verður til á DOMContentLoaded, á sama augnabliki og þessi
  // pappi ræsir — mæld útkoma var `tala = null` í 20 sek og ekkert ljós, því fyrsta
  // mælingin datt út og næsta var ekki fyrr en eftir 4 mín. Beðið í allt að 15 sek.
  let _bidEftirDB = 0;
  async function maela() {
    const c = sb();
    if (!c) {
      if (++_bidEftirDB <= 50) setTimeout(maela, 300);
      return;
    }
    _bidEftirDB = 0;
    if (_bid) return;
    _bid = true;
    try {
      const fra = new Date(Date.now() - DAGAR * 864e5).toISOString();
      const r = await c.from('email_digest')
        .select('message_id,subject,snippet,body_preview,received_at')
        .in('account', HOLF)
        .eq('folder', 'INBOX')
        .gte('received_at', fra)
        .order('received_at', { ascending: false })
        .limit(600);
      if (r.error) throw r.error;

      const postar = (r.data || []).filter(m => {
        const hay = ((m.subject || '') + ' ' + (m.body_preview || '') + ' ' + (m.snippet || '')).toLowerCase();
        return BEIDNI.test(hay);
      });

      // Svarað/falið er geymt á þjóninum af patch 240 — lesið þaðan svo ljósið og
      // listinn segi sama hlutinn. Bregðist þessi lestur er ljósið EKKI sýnt.
      const ids = postar.map(m => m.message_id).filter(Boolean);
      let afgreitt = new Set();
      if (ids.length) {
        const [hd, ac] = await Promise.all([
          c.from('reikninga_postur_hidden').select('message_id').in('message_id', ids),
          c.from('reikninga_postur_activity').select('message_id').in('message_id', ids),
        ]);
        if (hd.error) throw hd.error;
        if (ac.error) throw ac.error;
        (hd.data || []).forEach(x => afgreitt.add(x.message_id));
        (ac.data || []).forEach(x => afgreitt.add(x.message_id));
      }

      const opin = postar.filter(m => !afgreitt.has(m.message_id));
      _tala = opin.length;
      _elsta = opin.length ? opin[opin.length - 1].received_at : null;
    } catch (e) {
      // Ómælt — ekki núll. Ljósið hverfur og segir þar með ekkert ósatt.
      _tala = null;
      _elsta = null;
      if (window.console) console.warn('[380-reikningsbeidnir-ljos] mæling brást:', (e && e.message) || e);
    } finally {
      _bid = false;
      teikna();
    }
  }

  function takkar() {
    // TVEIR ólíkir staðir, mælt 19.09.2026:
    //   • valstikan á tölvu:   .vnav-btn[data-view="reikninga-postur"]
    //   • síma-appið (261):    ._app-tab[data-k="reikninga-postur"]   ← flipinn sem SÉST
    // Appið siglir með því að SMELLA á falda valstikuhnappinn (261:686), svo ljós
    // sem aðeins væri sett á `data-view` lenti á hnappi sem er `display:none` í
    // appinu — ósýnilegt nákvæmlega þar sem það á að sjást.
    return [
      ...document.querySelectorAll('[data-view="' + NAV_KEY + '"]'),
      ...document.querySelectorAll('._app-tab[data-k="' + NAV_KEY + '"]'),
    ];
  }

  function teikna() {
    const brynt = !!(_elsta && (Date.now() - new Date(_elsta).getTime()) > NYTT_MS);
    takkar().forEach(btn => {
      let b = btn.querySelector('._rb-ljos');
      if (!b) {
        b = document.createElement('span');
        b.className = '_rb-ljos';
        b.style.cssText = 'margin-left:6px;padding:1px 7px;border-radius:99px;font-size:10px;' +
          'font-weight:800;line-height:1.7;color:#fff;display:none;vertical-align:middle';
        btn.appendChild(b);
      }
      if (_tala == null || _tala === 0) { b.style.display = 'none'; return; }
      b.textContent = String(_tala);
      b.style.background = brynt ? '#dc2626' : '#f59e0b';
      b.title = _tala + ' ósvaraðar reikningsbeiðnir' +
        (brynt ? ' — elsta er eldri en sólarhringur' : '');
      b.style.display = 'inline-block';
    });
  }

  // Valstikan er endurteiknuð af öðrum pöppum (171 sidebar-customizer, 261
  // app-profiles). Ljósið er málað aftur þegar hnappurinn birtist á nýjan leik —
  // án þess að vekja nýja fyrirspurn.
  function vakta() {
    let t = 0;
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        // Aðeins teikna ef ljósið vantar; annars býr þetta til sína eigin lykkju.
        if (takkar().some(b => !b.querySelector('._rb-ljos'))) teikna();
      }, 300);
    });
    try { mo.observe(document.body, { childList: true, subtree: true }); } catch (_) {}
  }

  function raesa() {
    teikna();
    maela();
    setInterval(maela, PULS_MS);
    // Komið til baka í appið eftir hlé: mæla strax svo talan sé ekki gömul.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) maela(); });
    vakta();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', raesa);
  else raesa();

  window.ReikningsbeidnaLjos = {
    uppfaera: maela,
    tala: () => _tala,
  };
})();
