# -*- coding: utf-8 -*-
# Síður 1 og 2 af 2025-aðaluppdrættinum sem hrein JPEG í 6000-ramma (lengri hlið 6000) — fyrir Teikningu/TurboPaint/greininguna
import pymupdf, os
from PIL import Image
HER = os.path.dirname(os.path.abspath(__file__))
d = pymupdf.open(os.path.join(HER, 'pdf', 'innsiglad2025.pdf'))
for i in (0, 1):
    p = d[i]; kv = 6000 / max(p.rect.width, p.rect.height)
    pm = p.get_pixmap(matrix=pymupdf.Matrix(kv, kv))
    im = Image.frombytes('RGB', (pm.width, pm.height), pm.samples)
    fn = os.path.join(HER, 'ut', 'blad_h%d.jpg' % (i + 1)); im.save(fn, quality=86, optimize=True)
    print(fn, im.size, os.path.getsize(fn) // 1024, 'KB', 'kv', kv)
