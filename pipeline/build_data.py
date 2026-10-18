"""Build the frontend data files from data/ (raw API dumps + Thai i18n + tips).

Ported from the original single-file page's build.py. The logic is unchanged; the only
difference is the output: instead of filling placeholders in a single HTML
template, it writes JSON files to src/data/ that the React app imports.

Run:  npm run data   (or: python3 pipeline/build_data.py)
"""
import json, sys, re, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, 'data')
OUT = os.path.join(ROOT, 'src', 'data')


def load(*p):
    with open(os.path.join(DATA, *p), encoding='utf-8') as f:
        return json.load(f)


d = load('raw', 'gwentone_api.json')
ver = d['request']['REQUEST']['version']
pg = {x['_source']['id']: x['_source'] for x in load('raw', 'pg_cards.json') + load('raw', 'pg_leaders.json')}
th = load('i18n', 'th-all.json')
nl = lambda s: (s or '').replace('\\n', '\n').strip()


def opt(name):
    p = os.path.join(DATA, 'tips', name)
    if not os.path.exists(p):
        print('skip (not found):', name); return None
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print('skip (bad json):', name, e); return None


def rel(a):
    return [int(r) for r in re.split(r'[,\s]+', str(a.get('related') or '')) if r.isdigit() and int(r) > 0]


allc = {x['id']['card']: x for x in d['response'].values()}
out = []; need = set()
for x in d['response'].values():
    a = x['attributes']
    if a['set'] == 'NonOwnable': continue
    i = x['id']['card']; r = rel(a); need.update(r)
    out.append({'id': i, 'art': x['id']['art'], 'n': x['name'], 'f': a['faction'], 'f2': a['factionSecondary'],
      't': a['type'], 'p': a['power'], 'ar': a['armor'], 'v': a['provision'], 'c': a['color'], 'r': a['rarity'],
      'cat': x['category'] or '', 'ab': nl(x['ability']), 'fl': nl(x['flavor']), 'abT': nl(th[str(i)].get('ab')), 'flT': nl(th[str(i)].get('fl')),
      's': a['set'], 'au': a.get('artist') or '', 'rel': r,
      'pi': ((pg.get(i) or {}).get('preview_img_path') or {}).get('big', '').replace('/uploads/media/assets_preview/', '')})

# tokens (NonOwnable) referenced by related -> minimal data
tok = {}
_tp = os.path.join(DATA, 'i18n', 'th-tokens.json')
thtok = load('i18n', 'th-tokens.json') if os.path.exists(_tp) else {}
print('th-tokens:', len(thtok) if thtok else 'skip (not found)')
for i in need:
    x = allc.get(i)
    if x and x['attributes']['set'] == 'NonOwnable':
        a = x['attributes']
        tok[i] = {'id': i, 'art': x['id']['art'], 'n': x['name'], 'f': a['faction'], 't': a['type'], 'p': a['power'], 'c': a['color'], 'cat': x['category'] or '', 'ab': nl(x['ability']), 'fl': nl(x['flavor']), 'tok': 1}
        tt = thtok.get(str(i)) or {}
        if nl(tt.get('ab')): tok[i]['abT'] = nl(tt.get('ab'))
        if nl(tt.get('fl')): tok[i]['flT'] = nl(tt.get('fl'))

kwsrc = load('tips', 'keywords-src.json')
kwth = opt('keywords-th.json') or {}
kw = {k: {'en': v.get('def_en', ''), 'th': (kwth.get(k) or {}).get('def_th', ''), 'tips': (kwth.get(k) or {}).get('tips', [])} for k, v in kwsrc.items()}
arch = opt('archetypes.json')
ctips = opt('cards.json')

# English tips (AI translation of the Thai tips · same order) -> tipsEn / summary_en / tips_en · counts must match the Thai
kwen = opt('keywords-en.json') or {}
for k, v in kw.items():
    if v['tips']:
        e = kwen.get(k); assert e and len(e) == len(v['tips']), ('keywords-en.json', k)
        v['tipsEn'] = e
archen = opt('archetypes-en.json') or {}
for f, lst in (arch or {}).items():
    for i, x in enumerate(lst):
        e = (archen.get(f) or [None] * (i + 1))[i]
        assert e and e['name'] == x['name'] and len(e['tips']) == len(x.get('tips') or []), ('archetypes-en.json', f, i)
        x['summary_en'] = e['summary']; x['tips_en'] = e['tips']
cen = opt('cards-en.json') or {}
for k, v in (ctips or {}).items():
    e = cen.get(k); assert e and len(e) == len(v.get('tips') or []), ('cards-en.json', k)
    v['tipsEn'] = e
print('en tips: kw', sum(1 for v in kw.values() if 'tipsEn' in v), 'arch', sum(len(l) for l in (arch or {}).values()), 'ctips', len(ctips or {}))

sys.path.insert(0, HERE)
import pairs
PR, PLBL, LPR, PMETA = pairs.compute(out, set(kw), arch, tok)
for c in out:
    if c['id'] in PR: c['pr'] = PR[c['id']]
    if c['id'] in LPR: c['lp'] = LPR[c['id']]   # leader ability -> การ์ด (ใช้แนะนำการ์ดเข้าเดค ไม่โชว์ใน modal)
FALLBACK = {('Bronze', 'Common'): 30, ('Bronze', 'Rare'): 80, ('Gold', 'Epic'): 200, ('Gold', 'Legendary'): 800}
nfb = 0
for c in out:
    if c['t'] == 'Ability': continue
    s = pg.get(c['id'])
    if s is not None and 'crafting_cost' in s: c['cc'] = s['crafting_cost']
    else:
        c['cc'] = FALLBACK.get((c['c'], c['r']), 0); nfb += 1
print('craft fallback cards:', nfb)

# art flags from pipeline/check_art.py (npm run art): na = gwent.one (fallback) has no art (bit 1 low · 2 medium)
# lq = LQIP: cards from the playgwent preview ("c<id>"), tokens from the gwent.one art ("a<art>")
_av = os.path.join(DATA, 'art', 'avail.json'); _lq = os.path.join(DATA, 'art', 'lqip.json')
avail = load('art', 'avail.json') if os.path.exists(_av) else {}
lqip = load('art', 'lqip.json') if os.path.exists(_lq) else {}
for c in out + list(tok.values()):
    k = str(c['art']); av = avail.get(k)
    na = (0 if not av else (1 if not av[0] else 0) | (2 if not av[1] else 0))
    if na: c['na'] = na
    lk = ('a' + k) if c.get('tok') else ('c' + str(c['id']))
    if lk in lqip: c['lq'] = lqip[lk]
print('art: avail', len(avail) or 'skip (run npm run art)', 'lqip', len(lqip), 'no low', sum(1 for c in out if c.get('na', 0) & 1), 'no medium', sum(1 for c in out if c.get('na', 0) & 2))

os.makedirs(OUT, exist_ok=True)
J =lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))


def write(name, obj):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        f.write(J(obj))


write('cards.json', out)
write('tokens.json', tok)
write('keywords.json', kw)
write('archetypes.json', arch)
write('pairLabels.json', PLBL)
write('cardTips.json', ctips)
write('meta.json', {'ver': ver, 'count': len(out), 'hasKwTh': bool(kwth)})
print(len(out), ver, 'tokens', len(tok), 'kwth', len(kwth), 'arch', bool(arch), 'ctips', len(ctips or {}), 'paired', len(PR), 'leaders', len(LPR), 'avg', round(sum(len(v) for v in PR.values()) / max(1, len(PR)), 2))
