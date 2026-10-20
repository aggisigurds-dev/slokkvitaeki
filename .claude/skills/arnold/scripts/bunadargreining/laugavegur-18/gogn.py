# -*- coding: utf-8 -*-
# Laugavegur 18 (Heimaleiga - Máni Apartments, fyrirtæki 869) — ÚT-merki lesin af gridded nærmyndum (rammi 6006)
import json, os
from PIL import Image, ImageDraw
HER = os.path.dirname(os.path.abspath(__file__))
# (hæð, x, y, staður) — rammahnit (6006 px lengri hlið), miðja ÚT-kassa
UT = [
 (3, 1981, 2627, 'Stigagangur — norðurhluti, við flóttaleið'), (3, 1794, 2788, 'Gangur — við hurð að stigagangi'), (3, 1999, 3505, 'Stigahús — hringstigi'),
 (4, 3863, 2633, 'Stigagangur — norðurhluti, við flóttaleið'), (4, 3672, 2761, 'Gangur — við hurð að stigagangi'), (4, 3683, 3377, 'Gangur — við hurð að stigahúsi'), (4, 3875, 3479, 'Stigahús — hringstigi'),
 (5, 1984, 2626, 'Stigagangur — norðurhluti, við flóttaleið'), (5, 1797, 2777, 'Gangur — við hurð að stigagangi'), (5, 1889, 3475, 'Stigahús — hjá hringstiga'), (5, 1800, 3548, 'Stigahús — við hringstiga'),
 (6, 3854, 2604, 'Stigagangur — norðurhluti, við flóttaleið'), (6, 3664, 2755, 'Gangur — við hurð að stigagangi'), (6, 3665, 3560, 'Stigahús — við hringstiga'),
]
HAED = {  # nafn: (blað, x, y, w, h) — skurðir úr teikning_bord
 3: ('2018-04-2401575', 919, 622, 1165, 3257), 4: ('2018-04-2401575', 2775, 608, 1165, 3239),
 5: ('2018-04-2401574', 919, 599, 1165, 3268), 6: ('2018-04-2401574', 2757, 599, 1213, 3259)}
items = [dict(haed=h, flokkur='flotti', kodi='ÚT', bx=x, by=y, stadur=st) for h, x, y, st in UT]
json.dump(dict(items=items), open(os.path.join(HER, 'gogn.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print({h: sum(1 for i in items if i['haed'] == h) for h in HAED})
# sannreyndarmynd — yfirlag á hæðina (heil hæð, kvarði 0,5)
for h, (f, x, y, w, hh) in HAED.items():
    I = Image.open(os.path.join(HER, f + '.jpg')).convert('RGB'); c = I.crop((x, y, x + w, y + hh)); d = ImageDraw.Draw(c)
    for it in [i for i in items if i['haed'] == h]:
        cx, cy = it['bx'] - x, it['by'] - y
        d.ellipse([cx - 34, cy - 34, cx + 34, cy + 34], outline=(20, 150, 70), width=6)
    c = c.crop((0, hh // 2 - 100, w, hh)).resize((w // 1, (hh - (hh // 2 - 100)) // 1)); c.save(os.path.join(HER, 'sann_h%d.png' % h)); print('sann_h%d' % h, c.size)
