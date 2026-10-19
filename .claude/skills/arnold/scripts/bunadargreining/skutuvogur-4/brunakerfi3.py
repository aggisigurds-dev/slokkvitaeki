# (1) Voltorka-blöðin skeytt í eina mynd á hæð (norður + suður, hliðrun úr brunakerfi2) með brunakerfistáknum (einu sinni hvert);
# (2) ÚT-merki + stjórnstöð/útstöð úr textalagi 2025-blaðanna. Úttak: bk_1.jpg, bk_2.jpg, nyir_tki.json, ny_blod.json.
import cv2, numpy as np, json, pymupdf, sys
sys.path.insert(0, '.')
from afkoda import dk, hlidrad_letur
E = json.load(open('brunakerfi_endanlegt.json')); F, Hl = E['fund'], E['hlid']
KV = 0.6                                                     # niðurkvörðun myndar
HEITI = {'R': 'Reykskynjari', 'H': 'Hitaskynjari', 'HB': 'Brunahandboði'}
nyir, blod = [], []
for nr, (a, b) in enumerate((('13', '14'), ('15', '16')), 1):
    A = cv2.imread('raf/BN055104-505-00%s.jpg' % a); B = cv2.imread('raf/BN055104-505-00%s.jpg' % b)
    dx, dy = Hl[b]['dx'], Hl[b]['dy']
    hA, wA = A.shape[:2]; cut = int(hA * 0.95)                   # neðri brún teikningar norðurblaðsins
    hB = B.shape[0]; H = max(cut, dy + int(hB * 0.96))
    S = np.full((H, wA, 3), 255, np.uint8)
    S[:cut] = A[:cut]
    by0 = cut - dy; seg = B[by0:int(hB * 0.96)]
    if dx < 0: seg = np.pad(seg[:, -dx:], ((0, 0), (0, -dx), (0, 0)), constant_values=255)
    elif dx > 0: seg = np.pad(seg[:, :-dx], ((0, 0), (dx, 0), (0, 0)), constant_values=255)
    S[cut:cut + seg.shape[0]] = seg[:H - cut]
    pts = [(x, y, k) for x, y, s, k in F[a] if y < cut]
    for x, y, s, k in F[b]:
        X, Y = x + dx, y + dy
        if Y >= cut - 40 and not any(q[2] == k and (q[0] - X) ** 2 + (q[1] - Y) ** 2 < 60 ** 2 for q in pts): pts.append((X, Y, k))
    S2 = cv2.resize(S, None, fx=KV, fy=KV, interpolation=cv2.INTER_AREA)
    cv2.imwrite('bk_%d.jpg' % nr, S2, [cv2.IMWRITE_JPEG_QUALITY, 80])
    bid = 'bk%d' % nr
    blod.append({'id': bid, 'nafn': '%d. hæð — brunakerfi og neyðarlýsing (Voltorka 2020)' % nr, 'frum': {'b': S2.shape[1], 'h': S2.shape[0]},
                 'skurdur': {'x': int(wA * 0.035 * KV), 'y': int(hA * 0.04 * KV), 'w': int(wA * 0.80 * KV), 'h': int((H - hA * 0.04) * KV)},
                 'heimild': 'Voltorka ehf, teikn. 350-0%d-0%d og 350-0%d-0%d, 02.03.2020 — innrétting FYRIR breytingu 2025' % (nr, 2 * nr - 1, nr, 2 * nr)})
    tel = {}
    for x, y, k in sorted(pts, key=lambda p: (p[1] // 300, p[0])):
        tel[k] = tel.get(k, 0) + 1
        nyir.append({'audkenni': '%s%d' % (k, tel[k]) if nr == 1 else '%s%d' % (k, 100 + tel[k]), 'bunadur': HEITI[k], 'flokkur': 'brunakerfi', 'upplysingar': True,
                     'tegund': HEITI[k] + ' (brunaviðvörunarkerfi)', 'stadur': '', 'mhl': '02', 'haed': '%d. hæð' % nr, 'blad': bid, 'bx': round(x * KV), 'by': round(y * KV),
                     'heimild': 'Brunakerfisteikning Voltorku 02.03.2020 (fyrir breytingu 2025)'})
    print(bid, S2.shape, tel)
# ── ÚT + stjórnstöð/útstöð af 2025-blöðunum (rammi blaðanna b1/b2: pt × 120/72) ──
k = 120 / 72
d = pymupdf.open('skjol/Sk_tuvogur_4._A_aluppdr_tti.pdf')
for pg, bid, haed in ((3, 'b1', '1. hæð'), (4, 'b2', '2. hæð')):
    p = d[pg - 1]; ord_ = []
    for blk in p.get_text('dict')['blocks']:
        for l in blk.get('lines', []):
            for s in l['spans']:
                t = dk(s['text'], hlidrad_letur(s)).strip(); bb = s['bbox']
                if bb[0] < 2000 and t: ord_.append((t, (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2))
    import re
    rymi = [o for o in ord_ if len(o[0]) >= 4 and sum(c.isalpha() for c in o[0]) >= 4 and not re.match(r'^[d,.x ]', o[0]) and 'm²' not in o[0] and o[0] not in ('BRSL', 'SLT', 'HST') and not any(z in o[0] for z in ('ÚT', 'EI', 'Neyðar', 'Ofanlj', 'BRUNA', 'STÖÐ', 'Grunnmynd', 'opið', 'Opið', 'K:', 'MHL', 'Mhl', 'hæð', 'AREIM', 'R90', 'afmarkað', 'Eldstæði', 'sjónvarp', 'Handrið', 'Biðsvæði', 'handrið', 'Loftræsti', 'stokkur'))]
    uts = sorted([o for o in ord_ if o[0] == 'ÚT'], key=lambda o: (o[2] // 120, o[1]))
    for i, (t, x, y) in enumerate(uts, 1):
        n = min(rymi, key=lambda r: (r[1] - x) ** 2 + (r[2] - y) ** 2)[0] if rymi else ''
        uti = pg == 3 and (x < 560 or x > 1735 or y < 125 or y > 1600)
        hlid = 'vesturhlið' if x < 560 else 'austurhlið' if x > 1735 else 'norðurhlið' if y < 125 else 'suðurhlið'
        nyir.append({'audkenni': 'ÚT%d' % (i if pg == 3 else 100 + i), 'bunadur': 'Útgangur (ÚT-merki)', 'flokkur': 'flotti', 'upplysingar': True,
                     'tegund': 'Útidyr' if uti else 'Flóttaleið innanhúss', 'stadur': ('Útidyr á ' + hlid + ' — úr ' + n) if uti else ('Flóttaleið við ' + n + (' (að stiga)' if pg == 4 else '')), 'mhl': '02', 'haed': haed,
                     'blad': bid, 'bx': round(x * k), 'by': round(y * k), 'heimild': 'Aðaluppdr. 2025, ÚT-merki (rautt flóttaör + ÚT)'})
    print(bid, len(uts), 'ÚT')
for a, x, y, st in (('STJ', 1754, 1471, 'Við anddyri dúkasníðslu á suðurhlið (austurveggur) — yfirlitsmynd'), ('ÚTST', 1346, 20, 'Við aðalinngang verslunar (norður)')):
    nyir.append({'audkenni': a, 'bunadur': 'Stjórnstöð brunaviðvörunarkerfis' if a == 'STJ' else 'Útstöð brunaviðvörunarkerfis', 'flokkur': 'brunakerfi', 'upplysingar': True,
                 'tegund': 'Brunaviðvörunarkerfi (ÍST EN 54)', 'stadur': st, 'mhl': '02', 'haed': '1. hæð', 'blad': 'b1', 'bx': round(x * k), 'by': round(y * k),
                 'heimild': 'Aðaluppdr. 2025, blað 10-02 + byggingarlýsing („Stjórnstöð og yfirlitsmynd er við anddyri dúkasníðslu á suðurhlið")'})
json.dump(nyir, open('nyir_tki.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(blod, open('ny_blod.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(nyir), 'ný atriði')
