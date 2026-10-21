# -*- coding: utf-8 -*-
# samsetja.py <hæð> <blender-mynd> <úttak> — haus + skýringar (með sömu táknum og Blender-myndin) utan um Vinnuskjalið
import json, os, sys
from collections import Counter
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(encoding='utf-8')
HER = os.path.dirname(os.path.abspath(__file__))
HAED = int(sys.argv[1]); MYND = sys.argv[2]; UT = sys.argv[3]
TAKN = 'C:/Users/Slokkvitaeki/luna-bridge/blender/takn/'
S = json.load(open(os.path.join(HER, sys.argv[4] if len(sys.argv) > 4 else 'sena_greining_%d.json' % HAED), encoding='utf-8'))
tel = Counter(('sl' if t['gerd'] == 'slokkvitaeki' else t['stimpill']) for t in S['haedir'][0]['taeki'])
LJ = 'C:/Users/Slokkvitaeki/luna-bridge/blender/takn/ljosm/'
LEG = [('sl', LJ + 'slett.png', 'Slökkvitæki'), ('slanga', LJ + 'slanga_rod.png', 'Slöngukefli'), ('ut', TAKN + 'ut.png', 'ÚT-ljós'), ('reykskynjari', LJ + 'reykskynjari.png', 'Reykskynjarar'),
       ('bjalla', TAKN + 'bjalla.png', 'Handboðar'), ('hita', LJ + 'hitaskynjari.png', 'Hitaskynjari'), ('rafmagn', TAKN + 'rafmagn.png', 'Stjórnstöð / útstöð')]
im = Image.open(MYND).convert('RGB'); W, H = im.size
TOP = 190
c = Image.new('RGB', (W, H + TOP), (28, 31, 36)); c.paste(im, (0, TOP)); d = ImageDraw.Draw(c)
d.text((52, 30), 'Skútuvogur 4 — %d. hæð' % HAED, font=ImageFont.truetype('C:/Windows/Fonts/georgiab.ttf', 56), fill=(244, 238, 226))
d.text((54, 106), 'Búnaðargreining · aðaluppdráttur 09.12.2025 og brunakerfi Voltorku 2020 · tillaga — staðfest á staðnum', font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 25), fill=(176, 170, 160))
fb = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 22)
x = 54; y = 140
for lyk, skra, nafn in LEG:
    n = tel.get(lyk, 0)
    if not n: continue
    ik = Image.open(skra).convert('RGBA'); ik.thumbnail((46, 46), Image.LANCZOS)
    lab = '%d %s' % (n, nafn); w = d.textlength(lab, font=fb)
    if x + 42 + 10 + w > W - 40: break
    c.paste(ik, (int(x + (46 - ik.width) // 2), y - 8 + (46 - ik.height) // 2), ik); d.text((x + 56, y + 15), lab, font=fb, fill=(244, 238, 226), anchor='lm'); x += 56 + w + 22
c.save(UT, quality=95); print('vistað', UT, c.size)
