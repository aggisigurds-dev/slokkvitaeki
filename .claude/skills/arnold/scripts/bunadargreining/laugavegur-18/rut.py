# -*- coding: utf-8 -*-
import sys
from PIL import Image, ImageDraw
HAED = {  # nafn: (blað, x, y, w, h) — skurðir úr teikning_bord (rammi 6006)
 '3': ('2018-04-2401575', 919, 622, 1165, 3257), '4': ('2018-04-2401575', 2775, 608, 1165, 3239),
 '5': ('2018-04-2401574', 919, 599, 1165, 3268), '6': ('2018-04-2401574', 2757, 599, 1213, 3259)}
for n, (f, x, y, w, h) in HAED.items():
    I = Image.open(f + '.jpg').convert('RGB')
    for d, (y0, y1) in enumerate(((y, y + h // 2 + 60), (y + h // 2 - 60, y + h))):
        c = I.crop((x, y0, x + w, y1)); dr = ImageDraw.Draw(c)
        for gx in range((x // 200 + 1) * 200, x + w, 200):
            dr.line([(gx - x, 0), (gx - x, c.height)], fill=(255, 120, 0), width=1); dr.text((gx - x + 2, 2), str(gx), fill=(220, 0, 0))
        for gy in range((y0 // 200 + 1) * 200, y1, 200):
            dr.line([(0, gy - y0), (c.width, gy - y0)], fill=(255, 120, 0), width=1); dr.text((2, gy - y0 + 2), str(gy), fill=(220, 0, 0))
        c.save('h%s_%d.png' % (n, d + 1)); print(n, d + 1, c.size)
