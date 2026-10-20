# -*- coding: utf-8 -*-
# Samantekt Suðurhella 5: fjöldi á hæð + í heild + per rými. Les items.json (úr bua.py).
import json, os
from PIL import Image, ImageDraw, ImageFont
HER = os.path.dirname(os.path.abspath(__file__))
items = json.load(open(os.path.join(HER, 'items.json'), encoding='utf-8'))['items']
tel = lambda h, f: sum(1 for i in items if i['haed'] == h and i['flokkur'] == f)
def font(sz, b=False):
    for f in (('C:/Windows/Fonts/arialbd.ttf',) if b else ('C:/Windows/Fonts/arial.ttf',)):
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()
FB, FN, FS = font(38, True), font(34), font(28)
RAD = [('Handslökkvitæki', 'slokkvitaeki', (214, 40, 40)), ('Brunaslöngur (20 m)', 'slanga', (20, 90, 220)),
       ('Útgangar (ÚT)', 'flotti', (20, 150, 70)), ('Björgunarop', 'bjorgun', (240, 130, 0)), ('Reykskynjarar', 'brunakerfi', (140, 40, 190))]
W = 1500; rows = len(RAD) + 2
H = 130 + 70 * (rows + 1) + 90 + 70 * 8 + 120
img = Image.new('RGB', (W, H), (255, 255, 255)); d = ImageDraw.Draw(img)
d.text((30, 24), 'Suðurhella 5, Hafnarfirði — samantekt búnaðar', fill=(20, 20, 20), font=FB)
d.text((30, 76), 'Úr aðaluppdrætti 15 023 (útg. F/E), samþykktum 17.09.2025 — lesið úr skjalinu sjálfu', fill=(90, 90, 90), font=FS)
y = 130; cols = [30, 640, 860, 1080, 1300]
for x, t in zip(cols, ['Búnaður', '1. hæð', '2. hæð', 'Samtals']):
    d.text((x, y), t, fill=(20, 20, 20), font=FB)
y += 62; d.line([(30, y), (W - 30, y)], fill=(120, 120, 120), width=3); y += 12
for nm, k, c in RAD:
    a, b = tel(1, k), tel(2, k)
    d.ellipse([30, y + 8, 62, y + 40], fill=c); d.text((78, y + 2), nm, fill=(20, 20, 20), font=FN)
    for x, v in zip(cols[1:], [a, b, a + b]):
        d.text((x, y + 2), str(v) if v else '–', fill=(20, 20, 20), font=FB if x == cols[3] else FN)
    y += 62
d.line([(30, y), (W - 30, y)], fill=(120, 120, 120), width=2); y += 14
sl = lambda h: tel(h, 'slokkvitaeki') + tel(h, 'slanga')
d.text((30, y), 'Slökkvibúnaður (tæki + slöngur)', fill=(20, 20, 20), font=FB)
for x, v in zip(cols[1:], [sl(1), sl(2), sl(1) + sl(2)]): d.text((x, y), str(v), fill=(214, 40, 40), font=FB)
y += 80
d.text((30, y), 'Á hverju rými (slökkvitæki · slanga)', fill=(20, 20, 20), font=FB); y += 56
for h, ids in ((1, ['0101', '0102', '0103', '0104', '0105', '0106']), (2, ['0107', '0108', '0109', '0110', '0111', '0112'])):
    for r in ids:
        s = [i for i in items if i['haed'] == h and i['rymi'] == r and i['flokkur'] == 'slokkvitaeki']
        b = [i for i in items if i['haed'] == h and i['rymi'] == r and i['flokkur'] == 'slanga']
        t = '%s   %d × SL (%s)%s' % (r, len(s), ', '.join(i['audkenni'] for i in s), ('   ·   1 × BS (%s)' % b[0]['audkenni']) if b else '')
        d.text((60, y), t, fill=(20, 20, 20), font=FS); y += 44
d.text((30, y + 10), '0104 á aðeins eitt SL (framhlið) — ekkert teiknað við bakhliðarútganginn.', fill=(140, 80, 0), font=FS)
img = img.crop((0, 0, W, y + 70)); img.save(os.path.join(HER, 'ut', 'Sudurhella5_samantekt.png'), optimize=True)
print('ok', img.size, {k: (tel(1, k), tel(2, k)) for _, k, _ in RAD})
