"""Card image cache for the app: gwent.one availability (fallback) + tiny blurred placeholders (LQIP).

Main image source = playgwent.com preview (`pi`, official, ~0.07 s). Every card has one; tokens do not.
gwent.one (fan site) answers after ~1 s even for its 404 page, so for the fallback the app needs to know up
front which sizes it really has: that is avail.json. Only art ids WITHOUT a playgwent preview (tokens) are
checked now; ids already in avail.json (an earlier full run) are kept.

Output (committed, read by build_data.py):
  data/art/avail.json  {"<art>": [low, medium]}  1 = gwent.one has it, 0 = 404
  data/art/lqip.json   {"c<card id>": b64 webp}  from the playgwent preview (leader card backs cropped)
                       {"a<art>": b64 webp}      tokens: from the gwent.one low art
Downloads (NOT committed): .cache/art/  (in .gitignore)

Run with the project venv (needs Pillow):
  npm run art              only checks/downloads what is not cached yet
  npm run art:refresh      re-checks gwent.one + rebuilds every placeholder
Then: npm run data
"""
import base64, io, json, os, sys, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, 'data')
OUTD = os.path.join(DATA, 'art')
CACHE = os.path.join(ROOT, '.cache', 'art')
GO = 'https://gwent.one/img/assets/{q}/art/{a}.jpg'
PG = 'https://www.playgwent.com/uploads/media/assets_preview/'
WORKERS = 8          # someone else's server: keep it polite
LQ_W = 16            # placeholder width in px (height follows the aspect ratio)
LQ_Q = 30            # webp quality
UA = {'User-Agent': 'gwent-thai-wiki-pipeline/1.0 (fan-made card viewer; art availability check)'}
REFRESH = '--refresh' in sys.argv


def load(p, default):
    try:
        with open(p, encoding='utf-8') as f: return json.load(f)
    except FileNotFoundError: return default


def save(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f: json.dump(obj, f, ensure_ascii=False, separators=(',', ':'), sort_keys=True)


def req(url, method='GET'):
    """-> (1, bytes|None) exists · (0, None) 404 · (None, None) unknown (network error / 5xx: retry next run)"""
    try:
        with urllib.request.urlopen(urllib.request.Request(url, method=method, headers=UA), timeout=30) as r:
            ok = r.status == 200 and (r.headers.get('Content-Type') or '').startswith('image/')
            return (1, r.read() if method == 'GET' else None) if ok else (0, None)
    except urllib.error.HTTPError as e:
        return (0, None) if e.code in (404, 410) else (None, None)
    except Exception:
        return (None, None)


# every art id the app can show: ownable cards + tokens referenced by "related" (same rule as build_data.py)
api = json.load(open(os.path.join(DATA, 'raw', 'gwentone_api.json'), encoding='utf-8'))['response']
pg = {x['_source']['id']: x['_source'] for f in ('pg_cards.json', 'pg_leaders.json') for x in json.load(open(os.path.join(DATA, 'raw', f), encoding='utf-8'))}
need = set(); arts = set(); cards = {}   # cards: card id -> (playgwent preview path, leader ability?)
for x in api.values():
    if x['attributes']['set'] != 'NonOwnable':
        need.update(int(r) for r in str(x['attributes'].get('related') or '').replace(',', ' ').split() if r.isdigit())
for x in api.values():
    a = x['attributes']; i = x['id']['card']
    if a['set'] == 'NonOwnable' and i not in need: continue
    pi = ((pg.get(i) or {}).get('preview_img_path') or {}).get('big', '').replace('/uploads/media/assets_preview/', '')
    if pi: cards[str(i)] = (pi, a['type'] == 'Ability')
    else: arts.add(str(x['id']['art']))      # no playgwent preview -> gwent.one is the only source
print('cards with a playgwent preview:', len(cards), '· art ids without one (gwent.one check):', len(arts))

avail = {} if REFRESH else load(os.path.join(OUTD, 'avail.json'), {})
lqip = load(os.path.join(OUTD, 'lqip.json'), {})
low_dir = os.path.join(CACHE, 'low'); pg_dir = os.path.join(CACHE, 'pgcard')
os.makedirs(low_dir, exist_ok=True); os.makedirs(pg_dir, exist_ok=True)


def check(k):
    """low: GET (exists + keep the file for the LQIP) · medium: HEAD"""
    lp = os.path.join(low_dir, k + '.jpg')
    if os.path.exists(lp) and not REFRESH: low = 1
    else:
        low, body = req(GO.format(q='low', a=k))
        if body: open(lp, 'wb').write(body)
    med, _ = req(GO.format(q='medium', a=k), 'HEAD')
    return k, low, med


todo = [k for k in arts if k not in avail]
print('to check:', len(todo), '(refresh)' if REFRESH else '')
unknown = 0
with ThreadPoolExecutor(WORKERS) as ex:
    for n, (k, low, med) in enumerate(ex.map(check, todo), 1):
        if low is None or med is None: unknown += 1; continue
        avail[k] = [low, med]
        if n % 100 == 0: print(' ', n, '/', len(todo)); save(os.path.join(OUTD, 'avail.json'), avail)
save(os.path.join(OUTD, 'avail.json'), avail)


def tiny(p, crop=False):
    """file -> base64 webp LQIP_W px wide · crop = leader card back: drop the border like CSS .pgl (inset 5% 6%)"""
    try:
        im = Image.open(p).convert('RGB')
    except Exception:
        return None
    if crop:
        dx, dy = round(im.width * .06), round(im.height * .05); im = im.crop((dx, dy, im.width - dx, im.height - dy))
    h = max(1, round(im.height * LQ_W / im.width))
    b = io.BytesIO(); im.resize((LQ_W, h), Image.LANCZOS).save(b, 'WEBP', quality=LQ_Q, method=6)
    return base64.b64encode(b.getvalue()).decode()


def make_card(i):
    pi, ab = cards[i]; p = os.path.join(pg_dir, i + '.jpg')
    if not os.path.exists(p):
        ok, body = req(PG + pi)
        if not body: return 'c' + i, None
        open(p, 'wb').write(body)
    return 'c' + i, tiny(p, ab)


def make_token(k):
    p = os.path.join(low_dir, k + '.jpg')
    return 'a' + k, (tiny(p) if avail.get(k, [0])[0] and os.path.exists(p) else None)


jobs = [(make_card, i) for i in cards if REFRESH or 'c' + i not in lqip] + [(make_token, k) for k in arts if k in avail and (REFRESH or 'a' + k not in lqip)]
with ThreadPoolExecutor(WORKERS) as ex:
    for k, s in ex.map(lambda j: j[0](j[1]), jobs):
        if s: lqip[k] = s
lqip = {k: v for k, v in lqip.items() if (k[0] == 'c' and k[1:] in cards) or (k[0] == 'a' and k[1:] in arts)}
save(os.path.join(OUTD, 'lqip.json'), lqip)

nl = sum(1 for k in arts if avail.get(k, [1, 1])[0] == 0); nm = sum(1 for k in arts if avail.get(k, [1, 1])[1] == 0)
print(f'gwent.one checked {len(avail)} (needed {len(arts)}) · unknown (retry next run) {unknown} · missing low {nl} · missing medium {nm} · lqip {len(lqip)} ({sum(map(len, lqip.values()))} b64 chars)')
