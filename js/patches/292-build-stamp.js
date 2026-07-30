/* === BYGGINGAR-STIMPILL v1 (2026-07-30) ===
 *
 * Af hverju: heilan dag fór í „boxin koma — boxin detta út" þar sem síðan
 * virkaði mælt á live en ekki hjá Agnari. Rótin var deploy-race (tvær
 * deploy-leiðir birtu SITT hvora útgáfuna, lagað í #524) — en það sem gerði
 * þetta ógreinanlegt var að ENGIN leið var til að sjá hvaða útgáfu vafrinn
 * hafði. Skjámyndir hjálpa ekki; sami skjár getur verið gamall kóði.
 *
 * Þessi patch birtir byggingar-auðkennið sem `build-dist.js` stimplar í
 * dist/index.html (`window.BUILD = {commit, time}`):
 *   • lítil, dempuð lína NEÐST í hliðarstikunni — sést alltaf, truflar ekki
 *   • smellur afritar „<commit> · <tími>" á klippiborð (til að senda mér)
 *   • `BUILD` í console við ræsingu (build-dist skrifar þá línu)
 *
 * Vantar stimpil (t.d. keyrt beint úr repo án build-dist) → „þróun (óstimplað)"
 * svo það sé augljóst að þetta er ekki framleiðslu-bygging.
 */
(() => {
  if (window.__buildStampInstalled) return;
  window.__buildStampInstalled = true;

  const B = window.BUILD || null;
  const txt = B && B.commit ? B.commit + " · " + B.time : "þróun (óstimplað)";

  function mount() {
    const nav = document.querySelector(".vnav-btn");
    const bar = nav && nav.parentElement;
    if (!bar) return false;
    if (bar.querySelector("._build-stamp")) return true;
    const el = document.createElement("div");
    el.className = "_build-stamp";
    el.title = "Útgáfa forritsins — smelltu til að afrita (sendu Claude ef eitthvað hegðar sér undarlega)";
    el.style.cssText = "margin:10px 8px 14px;padding:5px 8px;border-radius:7px;font-size:10.5px;" +
      "font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#94a3b8;background:rgba(148,163,184,.10);" +
      "cursor:pointer;user-select:none;line-height:1.35;word-break:break-all;text-align:center";
    el.textContent = "⚙ " + txt;
    el.addEventListener("click", async () => {
      const old = el.textContent;
      try { await navigator.clipboard.writeText(txt); el.textContent = "✓ afritað"; }
      catch (_) { el.textContent = txt; }
      setTimeout(() => { el.textContent = old; }, 1600);
    });
    bar.appendChild(el);
    return true;
  }

  // Hliðarstikan er endurbyggð af mörgum patchum (68 raðar henni, 245 skinnar
  // hana) — sami þrot-varði takturinn og 286 notar: fyrsta breyting ræsir
  // keyrslu eftir í mesta lagi 400 ms, engin endurstilling, plús hægt tif.
  let timer = null;
  const run = () => { timer = null; mount(); };
  const schedule = () => { if (!timer) timer = setTimeout(run, 400); };
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(run, 900);
  setInterval(run, 5000);

  window.BuildStamp = { text: txt, build: B };
})();
/* === END BYGGINGAR-STIMPILL === */
