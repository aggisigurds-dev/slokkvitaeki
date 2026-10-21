# -*- coding: utf-8 -*-
# sena_greining.py <hæð> — býr til Blender-senu (raunsætt útlit) úr vistaðri senu hæðarinnar (sena_67.json: veggir, hurðir, gler)
# með TÆKJUM ÚR BÚNAÐARGREININGUNNI í stað þeirra sem voru á Teikningu. Hnit: rammahnit borðsins → metrar senunnar með sömu S/kort og senan.
import json, math, os, sys
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')
HER = os.path.dirname(os.path.abspath(__file__))
HAED = int(sys.argv[1]) if len(sys.argv) > 1 else 1
UTAN = set((sys.argv[2] if len(sys.argv) > 2 else '').split(','))   # flokkar sem eru síaðir burt, t.d. r,ut (reykskynjarar, ÚT)
NAFN_UT = sys.argv[3] if len(sys.argv) > 3 else 'sena_greining_%d.json' % HAED
S0 = json.load(open(os.path.join(HER, 'sena_67.json'), encoding='utf-8'))
G = json.load(open(os.path.join(HER, 'greining661.json'), encoding='utf-8'))
SKRA = json.load(open(os.path.join(HER, 'skra.json')))
vm = S0['vinnumynd']; k = vm['kort']; sk = vm['S'][0]
h = S0['haedir'][0]
def ur_b(bx, by): return 1.5374 * bx - 62.5, 1.5378 * by - 42.6
def ur_bk(bx, by): return ur_b(SKRA['k'] * bx + SKRA['ox'], SKRA['k'] * by + SKRA['oy'])
def metrar(u, v): return (((u - k['sx']) * k['f'] - k['gw'] / 2) * sk, ((v - k['sy']) * k['f'] - k['gh'] / 2) * sk)

veggir = h['veggir']
def naesti_veggur(x, z):
    best = None
    for (x1, z1, x2, z2, th) in veggir:
        dx, dz = x2 - x1, z2 - z1; L2 = dx * dx + dz * dz or 1e-9
        s = max(0, min(1, ((x - x1) * dx + (z - z1) * dz) / L2)); px, pz = x1 + dx * s, z1 + dz * s
        d = math.hypot(x - px, z - pz)
        if best is None or d < best[0]: best = (d, px, pz, dx, dz)
    return best
def fri(x, z, ax, az, hamark=25.0):
    """fjarlægð frá (x,z) í stefnu (ax,az) að næsta vegg (sýnataka á 0,3 m fresti)"""
    t = 0.5
    while t < hamark:
        b = naesti_veggur(x + ax * t, z + az * t)
        if b and b[0] < 0.18: return t
        t += 0.3
    return hamark
def stefna(x, z):
    """(nx, nz, aVegg): hlið veggjarins sem snýr að opnara rýminu"""
    b = naesti_veggur(x, z)
    if not b or b[0] > 0.9: return 0.0, 1.0, False
    _, px, pz, dx, dz = b; L = math.hypot(dx, dz) or 1e-9; wx, wz = -dz / L, dx / L
    # byrja lengra frá veggnum svo geislinn lendi ekki strax á honum
    a = fri(x + wx * 0.3, z + wz * 0.3, wx, wz); c = fri(x - wx * 0.3, z - wz * 0.3, -wx, -wz)
    return (wx, wz, True) if a >= c else (-wx, -wz, True)

nafn = '%d. hæð' % HAED
GERD = {   # kind → (gerd, stimpill, tegund, aVegg)
    'sl': ('slokkvitaeki', 'lettvatn', 'Léttvatn', True), 'bs': ('slanga', 'slanga', 'Brunaslanga', True), 'ut': ('skilti-ut', 'ut', 'Útgangur', True),
    'r': ('reykskynjari', 'reykskynjari', 'Reykskynjari', False), 'hiti': ('hitaskynjari', 'hita', 'Hitaskynjari', False),
    'hb': ('bjalla', 'bjalla', 'Handboði', True), 'st': ('rafmagn', 'rafmagn', 'Stjórnstöð brunakerfis', True)}
taeki, tel = [], Counter()
for t in G['tki']:
    if t.get('haed') != nafn: continue
    if t.get('x') is not None and t.get('y') is not None: u, v = t['x'], t['y']
    elif t.get('blad') == 'bk1' and HAED == 1: u, v = ur_bk(t['bx'], t['by'])
    elif t.get('blad') in ('b1', 'b2') and t.get('bx') is not None: u, v = ur_b(t['bx'], t['by'])
    else: continue
    b = t.get('bunadur', '')
    kind = 'ut' if t.get('flokkur') == 'flotti' else 'bs' if ('löng' in b.lower() or 'kefli' in b.lower()) else 'sl' if t.get('flokkur') is None else 'r' if 'Reyk' in b else 'hiti' if 'Hita' in b else 'hb' if 'handb' in b.lower() else 'st'
    if kind in UTAN: continue
    gerd, stimpill, tegund, avegg = GERD[kind]
    if kind == 'sl':   # tegund slökkvitækis úr greiningunni: ræður myndinni (L · ABF · Duft · ABC · CO2 · annars rauða án texta)
        tt = (t.get('tegund') or '').lower().replace('₂', '2'); tegund = t.get('tegund') or 'Slökkvitæki'
        stimpill = 'co2' if ('co2' in tt or 'kolsýr' in tt) else 'duft' if ('duft' in tt or 'abc' in tt) else 'lettvatn' if ('léttvatn' in tt or 'lettvatn' in tt or ' l ' in (' ' + tt + ' ')) else ''
    x, z = metrar(u, v)
    nx, nz, vegg = stefna(x, z) if avegg else (0.0, 1.0, False)
    e = {'x': round(x, 3), 'z': round(z, 3), 'nx': round(nx, 4), 'nz': round(nz, 4), 'aVegg': bool(vegg), 'gerd': gerd, 'stimpill': stimpill, 'litur': '', 'tegund': tegund}
    taeki.append(e); tel[kind] += 1
print(nafn, 'tæki:', dict(tel), 'alls', len(taeki))
S = json.loads(json.dumps(S0))
S['haedir'][0]['taeki'] = taeki
S.pop('vinnumynd', None); S.pop('company_id', None)
S['prof_myndir'] = ['vinnuskjal']
S['taekjamyndir'] = True            # raunsaett.py: ljósmyndir af tækjum í stað tákna (21.10.2026)
json.dump(S, open(os.path.join(HER, NAFN_UT), 'w', encoding='utf-8'), ensure_ascii=False)
print('vistað', NAFN_UT, 'veggir', len(veggir))
