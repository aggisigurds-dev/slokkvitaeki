# Hönnunarstaðir Skútuvogs 4 (aðaluppdr. samþ. 09.12.2025) → rammi hæða Teikningar (2022-blöðin) + pörun við merki Agnars.
import json, math
S = json.load(open('spans.json', encoding='utf-8')); ST = json.load(open('stilling.json')); B = json.load(open('bord_661.json', encoding='utf-8'))
STADIR = {   # (síða, texti, x≈, y≈) → staður í orðum (lesið af blaðinu)
 (3, 'L', 550, 561): 'Lager 01-03 (gólfefnalager, 275 m²), vesturveggur við brunahólfaskil (EI90) að vörumóttöku — við BS1',
 (3, 'BRSL', 511, 568): 'Lager 01-03 (gólfefnalager, 275 m²), vesturveggur við brunahólfaskil (EI90) að vörumóttöku',
 (3, 'BRSL', 496, 782): 'Vörumóttaka (181,9 m²), vesturveggur ofan við útgang',
 (3, 'L', 500, 803): 'Vörumóttaka (181,9 m²), vesturveggur ofan við útgang — við BS2',
 (3, 'BRSL', 511, 938): 'Lager (90,1 m²), vesturveggur neðan við útgang',
 (3, 'L', 553, 951): 'Lager (90,1 m²), vesturveggur neðan við útgang — við BS3',
 (3, 'BRSL', 611, 1102): 'Lager 01-02 (727,5 m²), norðvesturhorn við vegg að lager 90,1 m²',
 (3, 'L', 643, 1125): 'Lager 01-02 (727,5 m²), norðvesturhorn — við BS4',
 (3, 'L', 495, 1471): 'Móttökuborð / starfsmenn, vesturhlið við útgang',
 (3, 'HST', 990, 764): 'Lager 01-02, við flóttahurð (EI60-CS) að verslun',
 (3, 'L', 1306, 66): 'Verslun 01-01, við aðalinngang (norður) — útstöð brunaviðvörunarkerfis',
 (3, 'HST', 1373, 874): 'Inntök / rafmagnstafla (2,7 m²)',
 (3, 'L', 1773, 888): 'Verslun 01-01, austurveggur við útgang',
 (3, 'HST', 1764, 984): 'Búðalager / vinnusvæði (186,1 m²), austurveggur við útgang',
 (3, 'L', 1527, 1299): 'Gangur við starfsmannaaðstöðu, við dyr að geymslu og stiga upp',
 (3, 'L', 1334, 1417): 'Dúkasníðsla (139 m²), norðvesturhorn við ræstingu — við BS5',
 (3, 'BRSL', 1317, 1469): 'Dúkasníðsla (139 m²), norðvesturhorn við ræstingu og fellitjald (E60-C)',
 (3, 'L', 1738, 1616): 'Lagnarými / inntök 01-04 (13,4 m²)',
 (4, 'L', 1388, 303): 'Verslun 02-01 (2. hæð), við stigahús og útgang (EI30-CS)',
 (4, 'L', 1516, 1322): 'Gangur 02-02 (2. hæð), við útgang að stiga (austur)',
}
ut = []
for pg in (3, 4):
    nafn = 'h1' if pg == 3 else 'h2'; st = ST[nafn]; hd = B['haedir'][0 if pg == 3 else 1]; k22 = hd['frum']['b'] / st['b22pt']
    for t, col, sz, bb, f in S[str(pg)]:
        if bb[0] > 2000 or not ((t in ('L', 'HST') and col == 'ed1f24') or t == 'BRSL'): continue
        cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
        lyk = next((k for k in STADIR if k[0] == pg and k[1] == t and abs(k[2] - bb[0]) < 6 and abs(k[3] - bb[1]) < 6), None)
        X, Y = (cx * st['s'] + st['ox']) * k22, (cy * st['s'] + st['oy']) * k22
        ut.append({'pg': pg, 't': t, 'x25': round(cx, 1), 'y25': round(cy, 1), 'x': round(X), 'y': round(Y), 'haed_id': hd['id'], 'haed': hd['nafn'], 'stadur': STADIR.get(lyk, '?')})
# pörun við merki Agnars (≤ 2,5 m; 1:100 → 28,35 pt/m)
for pg in (3, 4):
    hd = B['haedir'][0 if pg == 3 else 1]; st = ST['h1' if pg == 3 else 'h2']; pxm = 28.35 * hd['frum']['b'] / st['b22pt']
    for mk in hd['markers']:
        if mk.get('kind') == 'sign': continue
        c = [(math.hypot(u['x'] - mk['x'], u['y'] - mk['y']) / pxm, u) for u in ut if u['pg'] == pg and u['t'] != 'BRSL' and 'unitId' not in u]
        c.sort(key=lambda z: z[0])
        if c and c[0][0] <= 2.5: c[0][1]['unitId'] = mk['unitId']; c[0][1]['fjarl_m'] = round(c[0][0], 1)
        print(pg, mk['unitId'], 'næst:', round(c[0][0], 1) if c else None, 'm', c[0][1]['stadur'][:50] if c else '')
json.dump(ut, open('hannad.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(ut), 'staðir ·', sum(1 for u in ut if '?' == u['stadur']), 'óþekktir')
