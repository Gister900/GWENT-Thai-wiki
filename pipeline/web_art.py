"""Self-hosted card images for the web build (build:web / GitHub Pages) — no hot-linking to other sites.

Reads the images that pipeline/check_art.py already downloaded into .cache/art/ (nothing is fetched here):
  .cache/art/pgcard/<card id>.jpg   playgwent.com preview, 376x540  -> key c<card id>
  .cache/art/low/<art id>.jpg       gwent.one low art (tokens only) -> key a<art id>
and writes webp files that ARE committed (GitHub Actions builds from them, it never downloads images):
  public/art/l/<key>.webp   one size, LARGE_W px wide (the playgwent original), used everywhere: grid tiles are
                            >= 216 CSS px and phones are DPR 2-3, so a smaller thumb would look soft
Leader abilities keep their framed card back (the app crops it with CSS .pgl like the playgwent preview).
Only cards that have an LQIP (`lq` in src/data) get a file: the app uses `lq` to know a local image exists.

  npm run art:web          convert what is missing or older than its source (mtime)
  npm run art:web -- --all rebuild every file
"""
import json, os, sys
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(ROOT, '.cache', 'art')
OUT = os.path.join(ROOT, 'public', 'art')
LARGE_W = 376
Q_LARGE = int(os.environ.get('Q_LARGE', 78))
ALL = '--all' in sys.argv

lqip = json.load(open(os.path.join(ROOT, 'data', 'art', 'lqip.json'), encoding='utf-8'))
jobs = []
for k in lqip:
    src = os.path.join(CACHE, 'pgcard', k[1:] + '.jpg') if k[0] == 'c' else os.path.join(CACHE, 'low', k[1:] + '.jpg')
    jobs.append((k, src))
os.makedirs(os.path.join(OUT, 'l'), exist_ok=True)


def conv(job):
    k, src = job
    outs = [(os.path.join(OUT, 'l', k + '.webp'), LARGE_W, Q_LARGE)]
    if not os.path.exists(src):
        return k, ('skip' if not ALL and all(os.path.exists(p) for p, _, _ in outs) else 'missing')
    fresh = lambda p: os.path.exists(p) and os.path.getmtime(p) >= os.path.getmtime(src)
    if not ALL and all(fresh(p) for p, _, _ in outs): return k, 'skip'
    im = Image.open(src).convert('RGB')
    for p, w, q in outs:
        w = min(w, im.width)   # never upscale (gwent.one low tokens are 150 px wide)
        h = round(im.height * w / im.width)
        (im if w == im.width else im.resize((w, h), Image.LANCZOS)).save(p, 'WEBP', quality=q, method=6)
    return k, 'ok'


with ThreadPoolExecutor(8) as ex:
    res = list(ex.map(conv, jobs))
keys = set(lqip)
for f in os.listdir(os.path.join(OUT, 'l')):   # drop files of cards that are gone
    if f[:-5] not in keys: os.remove(os.path.join(OUT, 'l', f))
miss = [k for k, s in res if s == 'missing']
size = sum(os.path.getsize(os.path.join(OUT, 'l', f)) for f in os.listdir(os.path.join(OUT, 'l')))
print(f'web art: {len(res)} keys · new {sum(1 for _, s in res if s == "ok")} · missing source {len(miss)} {miss[:10]} · total {size / 1e6:.1f} MB')
if miss: sys.exit(1)
