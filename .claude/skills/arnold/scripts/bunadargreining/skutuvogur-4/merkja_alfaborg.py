# Auðkenni (S/BS) á hönnunarstaði 2025 + merktar myndir 1. og 2. hæðar til útprentunar.
import json, pymupdf, cv2, numpy as np
U = json.load(open('hannad.json', encoding='utf-8'))
VESTUR = 1200   # pt: lagerhlutinn vestan, verslunin austan
def rod(u): return (u['pg'], 0 if (u['pg'] == 3 and u['x25'] < VESTUR) else 1, u['y25'], u['x25'])
s = [u for u in U if u['t'] != 'BRSL']; b = [u for u in U if u['t'] == 'BRSL']
for i, u in enumerate(sorted(s, key=rod)): u['audkenni'] = 'S%d' % (i + 1)
for i, u in enumerate(sorted(b, key=lambda u: (u['pg'], u['y25']))): u['audkenni'] = 'BS%d' % (i + 1)
for u in U:
    u['stadur'] = u['stadur'].replace('við BS', 'við BS')
    if u['t'] == 'BRSL': u['tegund'] = 'Brunaslanga (ÍST EN 671)'
    elif u['t'] == 'HST' and 'rafmagnstafla' in u['stadur']: u['tegund'] = '5 kg kolsýra (HST — við aðalrafmagnstöflu skv. brunahönnun)'
    elif u['t'] == 'HST': u['tegund'] = 'Handslökkvitæki (HST — tegund ekki tilgreind)'
    else: u['tegund'] = '6 L léttvatn („L" á teikningu)'
# BS-tilvísanir í stöðum S-tækja: lesnar af röð BS (BS1 efst)
json.dump(U, open('hannad.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
d = pymupdf.open('skjol/Sk_tuvogur_4._A_aluppdr_tti.pdf')
DPI = 110; k = DPI / 72
for pg, klipp, ut in ((3, (440, 15, 1830, 1670), 'merkt_h1.png'), (4, (440, 15, 1830, 1670), 'merkt_h2.png')):
    p = d[pg - 1]; pix = p.get_pixmap(dpi=DPI)
    a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)[:, :, :3][:, :, ::-1].copy()
    for u in U:
        if u['pg'] != pg: continue
        x, y = int(u['x25'] * k), int(u['y25'] * k)
        c = (200, 90, 20) if u['t'] == 'BRSL' else (30, 30, 210)
        dx = -95 if u['t'] == 'BRSL' else 22
        cv2.circle(a, (x, y), 20, c, 4)
        cv2.putText(a, u['audkenni'], (x + dx, y - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.95, (255, 255, 255), 7)
        cv2.putText(a, u['audkenni'], (x + dx, y - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.95, c, 3)
    x0, y0, x1, y1 = [int(v * k) for v in klipp]
    cv2.imwrite(ut, a[y0:y1, x0:x1]); print(ut, a[y0:y1, x0:x1].shape)
for u in sorted(U, key=lambda u: (u['audkenni'][0] == 'B', int(u['audkenni'].lstrip('BS')))):
    print(u['audkenni'], u['haed'], u['stadur'][:70], '| Teikning:', u.get('unitId', '—'))
