/* === SALA · SÍMAHREINSUN (327, 2026-08-29) ================================
 *
 * Agnar: „mátt fiffa söluborðið aðeins í mobile view og henda út keldan og
 * þessum auka tökkum." Skjámyndin sýndi söluborðið á síma með FIMM fljótandi
 * tökkum ofan á vörunum — hver úr sínum patch, enginn þeirra hluti af Sölu:
 *
 *   #pe-pagelinks / -doc  link-takkar síðunnar (262) — „Keldan — fyrirtækjaleit"
 *   #pat-launch           🤖 AI-flokka póst (308)
 *   #cg-sk-trigger        ➕ CG-upptaka (297)
 *   #_dst-btn._float      📐 Dálkastjóri (326)
 *
 * Á tölvuskjá dreifast þeir og trufla lítið. Á síma leggjast þeir ofan á
 * vöruflísarnar — og Sala er einmitt skjárinn þar sem maður er með aðra hönd á
 * tækinu og hina á vörunni.
 *
 * ATH ÞETTA EYÐIR ENGU. Takkarnir standa óbreyttir á öllum öðrum síðum og á
 * tölvuskjá; hér er AÐEINS falið meðan Sala er virka sýnin í símaham. Dálka-
 * stjórinn á hvort eð er ekkert erindi á Sölu — þar er engin tafla.
 *
 * Af hverju CSS en ekki JS: sýnaskipti í þessu appi eru bara klasa-skipti á
 * .view, svo :has() eltir þau sjálfkrafa. JS hefði þurft fylgjara á hverja
 * sýn og hefði legið eftir í einhverri röð við fyrstu teikningu.
 * ======================================================================== */
(() => {
  const ID = '_sala-simi-hreinsun';
  if (document.getElementById(ID)) return;

  // Fljótandi lagið sem á EKKI heima ofan á vöruflísunum á síma.
  const HIDE = [
    '#pe-pagelinks',
    '#pe-pagelinks-doc',
    '#pat-launch',
    '#cg-sk-trigger',
    '#_dst-btn._float',
  ];

  // 2026-08-29 SÍÐAR: takmörkunin við símaham FELLD NIÐUR. „Keldan — fyrirtækjaleit"
  // flýtur líka yfir vöruflísunum á tölvuskjá („keldan like a idiot over there")
  // og Agnar bað upphaflega um að hún færi af SÖLUBORÐINU — ekki bara af símanum.
  // Gildir því í öllum hömum, en áfram AÐEINS meðan Sala er virka sýnin.
  const scope = 'html:has(#view-sala.active)';
  const css = HIDE.map((s) => scope + ' ' + s).join(',\n') +
    '{display:none!important}';

  const st = document.createElement('style');
  st.id = ID;
  st.textContent = css;
  document.head.appendChild(st);
})();
