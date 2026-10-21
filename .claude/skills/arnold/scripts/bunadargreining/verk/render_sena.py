# -*- coding: utf-8 -*-
# render_sena.py <sena_app.json> <greining.json> <bord.json> <haedId> <úttak.json> [--utan r,ut] [--vh 3.9] [--ekki-myndir]
# Setur tæki BÚNAÐARGREININGAR (í stað tækja Teikningar) inn í Blender-senu hæðarinnar (sena_ur_appi.cjs → blenderSena) og merkir hana
# `taekjamyndir` (ljósmyndir af slökkvitækjum, slöngum og skynjurum — raunsaett.py) og `prof_myndir:['vinnuskjal']`.
# Hnit: atriði greiningar → RAMMI borðsins (x,y, eða bx,by með teikningar[].varpa) → metrar senunnar: golf.x + ((u − skurdur.x)/skurdur.w − ½)·golf.w.
import json, math, os, sys
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')
a = [x for x in sys.argv[1:] if not x.startswith('--')]
SENA_F, GREINING_F, BORD_F, HAED_ID, UT_F = a[:5]
def opt(n, d=None):
    return sys.argv[sys.argv.index(n) + 1] if n in sys.argv and sys.argv.index(n) + 1 < len(sys.argv) else d
UTAN = set(x for x in (opt('--utan', '') or '').split(',') if x)
VH = opt('--vh')
S = json.load(open(SENA_F, encoding='utf-8'))
G = json.load(open(GREINING_F, encoding='utf-8'))
BORD = json.load(open(BORD_F, encoding='utf-8'))
h = [x for x in BORD if x['id'] == HAED_ID][0]
sk = h.get('skurdur') or {'x': 0, 'y': 0, 'w': h['frum']['b'], 'h': h['frum']['h']}
sc = S['haedir'][0]
golf = sc['golf']
blod = {b['id']: b for b in (G.get('teikningar') or []) if b.get('id')}

def ur_ramma(t):
    """(u, v) í ramma borðsins eða None"""
    if t.get('x') is not None and t.get('y') is not None:        # eigin hnit borðsins ganga fyrir (sama og Teikning, 445)
        return float(t['x']), float(t['y'])
    bl = blod.get(t.get('blad'))
    vp = bl and bl.get('varpa')
    if vp and t.get('bx') is not None:
        return vp['fx']['k'] * float(t['bx']) + vp['fx']['c'], vp['fy']['k'] * float(t['by']) + vp['fy']['c']
    if t.get('bx') is not None and t.get('blad') in (t.get('haed_id'), HAED_ID):
        return float(t['bx']), float(t['by'])
    return None

def metrar(u, v):
    return (golf['x'] + ((u - sk['x']) / sk['w'] - 0.5) * golf['w'], golf['z'] + ((v - sk['y']) / sk['h'] - 0.5) * golf['h'])

veggir = sc['veggir']
def naesti(x, z):
    best = None
    for (x1, z1, x2, z2, th) in veggir:
        dx, dz = x2 - x1, z2 - z1; L2 = dx * dx + dz * dz or 1e-9
        s = max(0, min(1, ((x - x1) * dx + (z - z1) * dz) / L2)); px, pz = x1 + dx * s, z1 + dz * s
        d = math.hypot(x - px, z - pz)
        if best is None or d < best[0]: best = (d, px, pz, dx, dz)
    return best
def fri(x, z, ax, az, hamark=25.0):
    t = 0.5
    while t < hamark:
        b = naesti(x + ax * t, z + az * t)
        if b and b[0] < 0.18: return t
        t += 0.3
    return hamark
def stefna(x, z):
    b = naesti(x, z)
    if not b or b[0] > 0.9: return 0.0, 1.0, False
    _, px, pz, dx, dz = b; L = math.hypot(dx, dz) or 1e-9; wx, wz = -dz / L, dx / L
    p = fri(x + wx * 0.3, z + wz * 0.3, wx, wz); n = fri(x - wx * 0.3, z - wz * 0.3, -wx, -wz)
    return (wx, wz, True) if p >= n else (-wx, -wz, True)

GERD = {'sl': ('slokkvitaeki', 'lettvatn', 'Léttvatn', True), 'bs': ('slanga', 'slanga', 'Brunaslanga', True), 'ut': ('skilti-ut', 'ut', 'Útgangur', True),
        'r': ('reykskynjari', 'reykskynjari', 'Reykskynjari', False), 'hiti': ('hitaskynjari', 'hita', 'Hitaskynjari', False),
        'hb': ('bjalla', 'bjalla', 'Handboði', True), 'st': ('rafmagn', 'rafmagn', 'Stjórnstöð brunakerfis', True)}
def kind_af(t):
    f, b = t.get('flokkur') or '', (t.get('bunadur') or '')
    if f == 'flotti': return 'ut'
    if f == 'brunakerfi': return 'r' if re_reyk(b) else 'hiti' if 'hita' in b.lower() else 'hb' if 'handbo' in b.lower() else 'st'
    return 'bs' if ('slang' in b.lower() or 'kefli' in b.lower()) else 'sl'
def re_reyk(b): return 'reykskynj' in b.lower()

nafn = h['nafn']
taeki, tel, vantar = [], Counter(), 0
for t in G['tki']:
    if t.get('haed_id') != HAED_ID and not (not t.get('haed_id') and t.get('haed') == nafn): continue
    uv = ur_ramma(t)
    if not uv: vantar += 1; continue
    kind = kind_af(t)
    if kind in UTAN: continue
    gerd, stimpill, tegund, avegg = GERD[kind]
    if kind == 'sl':
        tt = (t.get('tegund') or '').lower().replace('₂', '2'); tegund = t.get('tegund') or 'Slökkvitæki'
        stimpill = 'co2' if ('co2' in tt or 'kolsýr' in tt) else 'duft' if ('duft' in tt or 'abc' in tt) else 'lettvatn' if ('léttvatn' in tt or 'lettvatn' in tt or ' l ' in (' ' + tt + ' ')) else ''
    x, z = metrar(*uv)
    nx, nz, vegg = stefna(x, z) if avegg else (0.0, 1.0, False)
    taeki.append({'x': round(x, 3), 'z': round(z, 3), 'nx': round(nx, 4), 'nz': round(nz, 4), 'aVegg': bool(vegg), 'gerd': gerd, 'stimpill': stimpill, 'litur': '', 'tegund': tegund})
    tel[kind] += 1
sc['taeki'] = taeki
if VH:
    S['lofthaed'] = float(VH); sc['veggH'] = float(VH)
S.pop('vinnumynd', None); S.pop('vinnumyndir', None)
S['prof_myndir'] = ['vinnuskjal']
S['taekjamyndir'] = '--ekki-myndir' not in sys.argv
json.dump(S, open(UT_F, 'w', encoding='utf-8'), ensure_ascii=False)
print(json.dumps({'haed': nafn, 'tæki': dict(tel), 'alls': len(taeki), 'án_vörpunar': vantar, 'veggir': len(veggir)}, ensure_ascii=False))
