# -*- coding: utf-8 -*-
# Síðumúli 1 (Garðyrkjufélag Íslands, fyrirtæki 1198) — gildandi blað: aðaluppdráttur 2020-12-08 (skönnun 3008×2146 → rammi 6006×4289)
import json, os
from PIL import Image, ImageDraw
HER = os.path.dirname(os.path.abspath(__file__))
KV = 6006 / 3008.0
# (hæð, kóði, tegund, x, y [upprunadílar skönnunar], staður)
UT = [
 (1, 'ÚT', 839, 413, 'Andyri — útgangur'), (1, 'ÚT', 703, 454, 'Prentarasalur — dyr að stigagangi'), (1, 'ÚT', 890, 454, 'Stigagangur — austurhurð'),
 (1, 'ÚT', 269, 567, 'Afgreiðslurými — vesturútgangur'), (1, 'ÚT', 480, 683, 'Afgreiðslurými / skrifstofur — útgangur'), (1, 'ÚT', 842, 793, 'Suðurútgangur við skábraut'),
 (2, 'ÚT', 688, 1583, 'Stigagangur — hurð'), (2, 'ÚT', 730, 1583, 'Stigagangur — hurð'), (2, 'ÚT', 854, 1581, 'Stigagangur — austurhurð'),
 (2, 'ÚT', 389, 1718, 'Flóttaleið — vestur'), (2, 'ÚT', 387, 1894, 'Flóttastigi'),
 (3, 'ÚT', 1856, 1575, 'Stigagangur — hurð'), (3, 'ÚT', 1909, 1576, 'Stigagangur — hurð'), (3, 'ÚT', 1927, 1598, 'Stigagangur'), (3, 'ÚT', 1473, 1685, 'Hringstigi (kaffistofa)'),
]
BK = [(1, '!', 858, 373, 'Andyri'), (1, '!', 725, 483, 'Við stigagang / Prentarasal')]
# tillögur (ekki á teikningunni — „í samráði við SHS“): 2 handslökkvitæki á hæð, við stigagang og útgang (165.BR1)
SL = [
 (1, 700, 432, 'Prentarasalur, við stigagang (hjá ÚT-dyrum)'), (1, 292, 598, 'Afgreiðslurými, við vesturútgang'),
 (2, 712, 1612, 'Gangur við stigagang (hjá ÚT-dyrum)'), (2, 425, 1738, 'Gangur við vesturútgang / skrifstofur'),
 (3, 1842, 1601, 'Kaffistofa, við stigagang'), (3, 1498, 1668, 'Kaffistofa, vestan við hringstiga'),
]
CROP = {1: (150, 250, 1110, 1000), 2: (150, 1300, 1110, 1990), 3: (1340, 1440, 2300, 1990)}   # upprunadílar
HN = {1: '1. hæð', 2: '2. hæð', 3: '3. hæð'}
def ramma(x, y): return round(x * KV, 1), round(y * KV, 1)
items = []
for h, k, x, y, st in UT: items.append(dict(haed=h, flokkur='flotti', kodi=k, sx=x, sy=y, stadur=st))
for h, k, x, y, st in BK: items.append(dict(haed=h, flokkur='brunakerfi', kodi=k, sx=x, sy=y, stadur=st))
for h, x, y, st in SL: items.append(dict(haed=h, flokkur='sl', kodi='SL', sx=x, sy=y, stadur=st))
for it in items: it['bx'], it['by'] = ramma(it['sx'], it['sy'])
skurdur = {h: dict(x=round(b[0] * KV), y=round(b[1] * KV), w=round((b[2] - b[0]) * KV), h=round((b[3] - b[1]) * KV)) for h, b in CROP.items()}
json.dump(dict(items=items, skurdur=skurdur, KV=KV), open(os.path.join(HER, 'gogn.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print({h: sum(1 for i in items if i['haed'] == h) for h in (1, 2, 3)}, skurdur)
# sannreyndarmynd — yfirlag á skönnunina
I = Image.open(os.path.join(HER, 'adal403.jpg')).convert('RGB')
for h in (1, 2, 3):
    b = CROP[h]; k = 2.0; c = I.crop(b).resize((int((b[2] - b[0]) * k), int((b[3] - b[1]) * k)), Image.LANCZOS); d = ImageDraw.Draw(c)
    for it in [i for i in items if i['haed'] == h]:
        x, y = (it['sx'] - b[0]) * k, (it['sy'] - b[1]) * k
        col = {'flotti': (20, 150, 70), 'brunakerfi': (140, 40, 190), 'sl': (214, 40, 40)}[it['flokkur']]
        r = 22 if it['flokkur'] == 'sl' else 16
        d.ellipse([x - r, y - r, x + r, y + r], outline=col, width=4)
    c.save(os.path.join(HER, 'sann_h%d.png' % h))
