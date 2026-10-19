# Álfhella 9: ÚT-merki og reykskynjarar (R). mhl 01 (2020, 1-bita skönnun): sniðmát úr skýringum ([ÚT], [R]) í 0/90/270°.
# mhl 02 (2026, vigur): orð „ÚT"/„R" úr textalagi. Allt í 6000-díla ramma blaðanna (sama og Teikning / bunadur.json).
import cv2, numpy as np, json, pymupdf
a = cv2.imread('mhl01_grunn.png', cv2.IMREAD_GRAYSCALE)
SN = {'ÚT': (6180, 2889, 6224, 2918), 'R': (6189, 3078, 6221, 3112)}
LEG = (5880, 2870, 6700, 3240)
def nms(p, r=30):
    p = sorted(p, key=lambda q: -q[2]); u = []
    for q in p:
        if all((q[0] - b[0]) ** 2 + (q[1] - b[1]) ** 2 > r * r for b in u): u.append(q)
    return u
fund = []
for k, (x0, y0, x1, y1) in SN.items():
    t0 = a[y0:y1, x0:x1]
    for rot in (None, cv2.ROTATE_90_CLOCKWISE, cv2.ROTATE_90_COUNTERCLOCKWISE):
        t = t0 if rot is None else cv2.rotate(t0, rot)
        res = cv2.matchTemplate(a, t, cv2.TM_CCOEFF_NORMED)
        ys, xs = np.where(res >= 0.62)
        fund += [(int(x + t.shape[1] / 2), int(y + t.shape[0] / 2), float(res[y, x]), k) for y, x in zip(ys, xs)]
fund = [f for f in nms(fund) if not (LEG[0] < f[0] < LEG[2] and LEG[1] < f[1] < LEG[3])]
s01 = 6000 / a.shape[1]
ut = []
for x, y, s, k in fund:
    X, Y = round(x * s01), round(y * s01)
    haed = '1. hæð' if 2290 <= Y <= 3560 and 540 <= X <= 3500 else '2. hæð' if 330 <= Y <= 1610 and 540 <= X <= 3500 else None
    if haed: ut.append({'k': k, 'x': X, 'y': Y, 'haed': haed, 'blad': 'mhl01', 'skor': round(s, 2)})
print('mhl01:', {h: {k: sum(1 for u in ut if u['k'] == k and u['haed'] == h) for k in SN} for h in ('1. hæð', '2. hæð')})
p = pymupdf.open('mhl02.pdf')[0]; k2 = 6000 / max(p.rect.width, p.rect.height)
for w in p.get_text('words'):
    if w[4] in ('ÚT', 'R'):
        X, Y = round((w[0] + w[2]) / 2 * k2), round((w[1] + w[3]) / 2 * k2)
        if 270 <= X <= 1570 and 820 <= Y <= 3260: ut.append({'k': w[4], 'x': X, 'y': Y, 'haed': 'Mhl. 02', 'blad': 'mhl02', 'skor': 1})
print('mhl02:', {k: sum(1 for u in ut if u['k'] == k and u['blad'] == 'mhl02') for k in SN})
json.dump(ut, open('ut_brunakerfi.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# athugun
v = cv2.cvtColor(a, cv2.COLOR_GRAY2BGR)
for u in ut:
    if u['blad'] != 'mhl01': continue
    x, y = int(u['x'] / s01), int(u['y'] / s01); c = (0, 150, 0) if u['k'] == 'ÚT' else (200, 0, 160)
    cv2.circle(v, (x, y), 40, c, 6); cv2.putText(v, 'UT' if u['k'] == 'ÚT' else 'R', (x + 42, y), cv2.FONT_HERSHEY_SIMPLEX, 1.6, c, 4)
cv2.imwrite('ut_athugun.png', cv2.resize(v[400:4100, 500:4100], None, fx=0.4, fy=0.4))
