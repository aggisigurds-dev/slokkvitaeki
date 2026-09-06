---
name: frontend-profiler
description: Finnur sjálfvirkar DOM-lykkjur, pappa sem berjast um sama DOM-ið, layout-thrashing og örgjörva-/rafhlöðuleka í Slökkvitæki-appinu (vanilla JS, 320+ pappar, ekkert framework). Kveikjuorð — „render loop", „thrashing", „étur örgjörva", „rafhlaða", „hleður endalaust", „flöktir", „debounce hleypur aldrei", „infinite loop", „34 sinnum á sekúndu".
---

# Frontend profiler — Slökkvitæki-appið

Appið er ekki React/Vue. Það eru ~324 sjálfstæðir pappar (`js/patches/*.js`) sem allir mega snerta
sama DOM-ið, og **165 þeirra eiga MutationObserver**. Lykkjurnar hér heita því ekki `useEffect` með
ranga dependency-fylkingu, heldur:

| Mynstur | Dæmi (fundið 06.09.2026) | Afleiðing |
|---|---|---|
| **Tveir pappar berjast um sama hnút** — annar setur inn, hinn fjarlægir, báðir í MutationObserver | 01-sala-suite (`ensureButton` í observer+rAF) vs 06-pos-fixes (`removeToolButtons` í observer) | 5 takkar × 34×/s = 170 body-breytingar/s, endalaust |
| **„Idempotent" pappi sem er það ekki** — ber saman við texta sem vafrinn skrifar öðruvísi | 244-sidebar-svg-icons: `spec.d` (`<path/>`) ≠ `svg.innerHTML` (`<path></path>`) → táknið fjarlægt+sett inn í hverri umferð | ~1.170 remove+insertBefore/s á 62 nav-tökkum |
| **Debounce sem hleypur aldrei** af því síðan er aldrei róleg | 358 (150 ms debounce) — síðan mældist með ~2.500 breytingar/s | Reiturinn birtist aldrei; „virkar ekki" |
| **Observer sem skrifar það sem hann horfir á** án marks/undirskriftar | 295 var með þetta 2026-08 (lagað með `dataset.sig`) | 150 ms endurteikning að eilífu |
| `setInterval` < 1 s sem skrifar DOM án þess að athuga hvort nokkuð breyttist | 00-legacy á 17 interval | Stöðugt flökt, rafhlaða |

## 1. Mæla FYRST — aldrei giska

Í Browser-pane (eða DevTools) á lifandi síðunni. **0–5 breytingar/s í kyrrstöðu er eðlilegt;
>30/s er galli; >500/s er lykkja.**

```js
// A. Hve mikið hreyfist og HVAR (2 s)
const sl=ms=>new Promise(r=>setTimeout(r,ms)); const t={}; let n=0;
const mo=new MutationObserver(ms=>{for(const m of ms){n++;const x=m.target;
  const k=(x.nodeType===1?(x.id?'#'+x.id:x.tagName+'.'+(x.className||'').toString().slice(0,22)):x.nodeName)+':'+m.type;
  t[k]=(t[k]||0)+1;}});
mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,characterData:true});
await sl(2000); mo.disconnect();
({perSec:Math.round(n/2), top:Object.entries(t).sort((a,b)=>b[1]-a[1]).slice(0,8)})
```

```js
// B. HVER skrifar — krókar á DOM-aðferðir + stack (1 s). Skiptu isTarget út fyrir hnútinn úr A.
const isTarget=el=>!!(el&&el.classList&&el.classList.contains('vnav-btn'));
const st={}, P=Node.prototype, E=Element.prototype;
function rec(k){const s=(new Error().stack||'').split('\n').slice(2,6).map(x=>x.trim().replace(/^at /,'')).join(' <- ');st[k+' | '+s]=(st[k+' | '+s]||0)+1;}
const o={ib:P.insertBefore,rc:P.removeChild,ac:P.appendChild,rm:E.remove};
P.insertBefore=function(a,b){if(isTarget(this))rec('insertBefore');return o.ib.call(this,a,b)};
P.removeChild=function(a){if(isTarget(this))rec('removeChild');return o.rc.call(this,a)};
P.appendChild=function(a){if(isTarget(this))rec('appendChild');return o.ac.call(this,a)};
E.remove=function(){if(isTarget(this.parentNode))rec('child.remove');return o.rm.apply(this,arguments)};
const d=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
Object.defineProperty(Element.prototype,'innerHTML',{configurable:true,get:d.get,set:function(v){if(isTarget(this))rec('innerHTML');return d.set.call(this,v)}});
await new Promise(r=>setTimeout(r,1000));
P.insertBefore=o.ib;P.removeChild=o.rc;P.appendChild=o.ac;E.remove=o.rm;Object.defineProperty(Element.prototype,'innerHTML',d);
Object.entries(st).sort((a,b)=>b[1]-a[1]).slice(0,4)
```

Stack-ið vísar í `_bundle-N.<hash>.js:LÍNA:DÁLKUR`. Lesa minified kóðann þar (`sed -n LÍNAp dist/js/_bundle-N.*.js | cut -c DÁLKUR-500...`) og finna sérkenni (klasanafn, id, `data-*`) → `grep -ln` í `js/patches/`. Til dæmis `data-sb-svg` → 244.

## 2. Kyrrstöðu-yfirferð (candidate-listi, ekki dómur)

```bash
for f in $(grep -l "new MutationObserver" js/patches/*.js js/*.js); do
  w=$(grep -c "innerHTML\s*=\|insertBefore(\|appendChild(\|\.remove()\|replaceChildren(\|insertAdjacentHTML(" "$f")
  echo "$w skrif $(grep -c 'new MutationObserver' "$f") obs $(grep -c requestAnimationFrame "$f") rAF $(grep -c 'setInterval(' "$f") interval $(basename $f)"
done | sort -rn | head -30
```

Það sem er ofarlega hér er *grunur*. Dómur kemur aðeins úr mælingu (1). Pappi með observer sem skrifar
DOM er í lagi ef hann (a) skrifar aðeins þegar ástandið er raunverulega rangt og (b) ber saman við það
sem vafrinn raunverulega skilar (seríalíserað, `isConnected`, `dataset.sig`).

## 3. Lagfæringarreglur (í þessari röð)

1. **Einn eigandi per DOM-svæði.** Tveir pappar mega ekki bæði setja inn og fjarlægja sama hnút. Sá sem
   vill hnútinn burt felur hann með CSS (`display:none !important`) — fjarlægir ekki.
2. **Idempotens er mæld, ekki fullyrt.** Eftir lagfæringu: keyra A aftur — 0 breytingar frá pappanum
   í annarri umferð. Samanburður á SVG/HTML: bera saman við `el.innerHTML` af nýbyggðum hnút, aldrei við
   sniðmátsstrenginn.
3. **Throttle, ekki debounce,** þegar vaktin á að bregðast við á lifandi síðu (síðan er aldrei róleg):
   `if (timer) return; timer = setTimeout(run, Math.max(60, 400 - (Date.now() - last)))`.
4. **Undirskrift** (`el.dataset.sig = …`) á allt sem observer teiknar, og teikna aðeins ef undirskriftin
   breyttist (295 er fyrirmyndin).
5. **Aldrei fjarlægja+setja inn** þegar `style.display`/`hidden`/klasi dugar.
6. **`setInterval` < 1 s:** aðeins ef hann les og ber saman áður en hann skrifar.

## 4. Skil

Eins og `villuleit`-skillið: Charlize-færsla per *mynstur* (`--topic kerfi`), einn listi (Verkefnalisti
eða `docs/`), og málsgrein til Agnars: hve mörg staðfest með mælingu, hve mörg grunuð, tölur fyrir/eftir.
Sagt hreint út hvað er óprófað. Sjá Charlize #418 (01/06) og #419 (244) fyrir tvö staðfest dæmi.
