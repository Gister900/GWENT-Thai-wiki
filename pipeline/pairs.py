# pairs.py r8 — จับคู่การ์ดจาก "ความสามารถ" เป็นหลัก (deterministic, regex ล้วน ไม่มี AI)
# reason = [kind, label, la, lb]  la/lb = index บรรทัด (ไม่นับบรรทัดว่าง) ใน ab/abT ของใบที่ดู / ใบคู่ (-1 = ไม่มี)
#   kind: n = เอ่ยชื่อ · m = กลไกส่งต่อกัน (label = id กลไก) · t = ใบที่ดูอ้างแท็กของคู่ · tr = คู่อ้างแท็กของใบที่ดู
#         h = Harmony (label = แท็กหลักของใบที่ไม่ใช่ Harmony) · a = เดคแนวเดียวกัน (label = ชื่อเดค)
import re

SC = {'n': 100, 'm': 60, 't': 40, 'h': 30, 'tr': 15, 'a': 10}
SC_M = {'zeal': 35, 'coin': 40}   # กลไกกว้าง (ใบ Order / ใบ Coin มีเยอะ) ได้น้อยกว่ากลไกเฉพาะ (60)
SC_TRC = 30         # แท็กทางกลับที่ใบคู่อ้างแท็กชัด (เช่น King Chrum "number of Ogroids in your starting deck") = ถึงเกณฑ์ลำพังได้ · อ้างผ่านๆ ยัง 15
TRIBAL_BONUS = 65   # ใช้เรียงเท่านั้น (ไม่โชว์): คู่แท็กใหญ่ที่คู่ก็อ้างแท็กเดียวกัน ขึ้นก่อนคู่ที่มีกลไก (t+m = 100)
MIN_SCORE = 30      # ต่ำกว่านี้ไม่แสดง (tr / a / tr+a ลำพังไม่พอ)
MAX_PAIRS = 8
TAG_CAP = 30        # แท็กในฝ่าย+Neutral เกินนี้ = จับได้เฉพาะตอนใบที่ดูอ้างแท็กชัด (CLEAR) แล้วจัดอันดับแทนการตัดทิ้ง · ทางกลับ (tr) ยังตัดที่เพดานนี้
TAG_HARD = 80       # เกินนี้ = กว้างจริง ตัดทิ้งเสมอ (Human · Mage ของ Neutral)
HARMONY_RARE = 6    # แท็กหลักที่มีในฝ่ายตัวเองไม่เกินนี้ = นับเป็น "แท็กหลากหลาย" ป้อน Harmony

ST = ['Bleeding', 'Poison', 'Lock', 'Spying', 'Veil', 'Shield', 'Vitality', 'Resilience', 'Bounty', 'Doomed']
FORMS = {'Poison': 'Poison(?:ed|s)?', 'Lock': 'Lock(?:ed|s)?', 'Shield': 'Shield(?:ed|s)?', 'Veil': 'Veil(?:ed)?'}
HZ = r"(?:Frost|Rain|Fog|Storm|Blood Moon|Dragon's Dream)"


def status_rx(S):
    F = FORMS.get(S, S)
    give = rf"\b(?:[Gg]ive|[Gg]ives|[Gg]rant|[Gg]rants|[Aa]pply|[Aa]pplies|[Gg]ain|[Gg]ains)\b[^.\n]{{0,60}}\b{S}\b"
    if S == 'Poison': give += r"|\bPoison(?:s)? (?:a|an|all|\d|the|enemy|it|random|that|both|each)\b"
    if S == 'Lock': give += r"|\bLock(?:s)? (?:a|an|all|\d|the|enemy|it|random|that|both|each)\b"
    use = (rf"\b{F} (?:enemy |allied )?(?:units?|cards?)\b|\b(?:with|has|have|is|are|it's|it is)(?: a| an)? {F}\b"
           rf"|\b(?:[Ww]henever|[Ee]ach time|[Ww]hen)\b[^.\n]{{0,50}}\b{F}\b|\b(?:for each|number of|amount of|[Rr]emove)\b[^.\n]{{0,40}}\b{F}\b"
           rf"|\b{F} (?:is|are) (?:applied|removed)")
    return give, use


# กลไก: id -> (ป้ายไทย, regex ฝั่ง "ให้", regex ฝั่ง "ใช้", regex ตัดทิ้งฝั่งใช้)
# ทุก regex ทาบทีละบรรทัดของความสามารถ EN
DW_GIVE = (r"\bConsume (?:an?|\d+|your|all|all other)? ?(?:allied|adjacent)\b|\bConsume your adjacent"
           r"|\b[Dd]estroy (?:an?|\d+|all|the)? ?(?:other )?allied units?\b|\b[Tt]rigger[^.\n]{0,40}\bDeathwish\b"
           r"|\b(?:unit|card)s? with (?:the )?Deathwish\b|\bDeathwish (?:unit|ability)")
MECH = {
    'dw': ('Deathwish', DW_GIVE, r"^Deathwish\b|^[^:\n]{0,30}\bDeathwish(?: \([^)]*\))?:", None),
    'grave': ('สุสาน', r"\b[Dd]estroy self\b|\b[Mm]ove (?:self|it|them)[^.\n]{0,20}to (?:your|the) graveyard|\bDiscard (?:a|the|\d|up|cards?|it)\b|\bConsume (?:an?|\d+|your)? ?(?:allied|adjacent)\b|\b[Dd]estroy (?:an?|\d+)? ?allied units?\b",
              r"\bfrom (?:your|a) graveyard\b|\bin your graveyard\b|\benters? your graveyard\b", r"Discarded"),
    'spawn': ('Spawn', r"\bSpawn(?:s)?\b(?! one or more)|\bCreate\b",
              r"[Ww]henever you Spawn|\bis Spawned\b|\bfor each unit Spawned|\bAssimilate\b|not from your starting deck", None),
    'deck': ('เล่นจากเดค / เดคบาง', r"\b(?:[Pp]lay|Summon)\b[^.\n]{0,40}\bfrom your deck\b",
             r"\bcards? in your deck\b|\bfewer[^.\n]{0,25}in your deck|\bdeck (?:is empty|has no)", r"Reveal|shuffle"),
    'discard': ('Discard', r"\bDiscard(?:s)? (?:a|an|the|\d|up|all|random|cards?|it)\b",
                r"\b(?:is|are) Discarded\b|[Ww]henever you Discard|\bthe Discarded\b", None),
    'cooldown': ('Cooldown', r"\b(?:[Rr]eset|[Rr]educe)\w* (?:its|an allied unit's|the Cooldown of (?:an?|each|all)|Cooldown of (?:an?|each|all))[^.\n]{0,30}Cooldown|\b(?:[Rr]eset|[Rr]educe)\w* (?:the )?Cooldown of\b",
                 r"^Cooldown:? \d|\bCooldown: \d", None),
    'charge': ('Charge', r"\b[Gg]ive \d+ Charges? to\b",
               r"^Charges?:? \d|\bCharges?: \d", None),
    # Zeal / รีเซ็ต Order: ฝั่งรับ = ยูนิตที่มี Order และยังไม่มี Zeal (เช็กระดับใบใน compute)
    'zeal': ('Order / Zeal', r"\b[Gg]ive[^.\n]{0,25}\bZeal\b|\breset its Order|\b[Rr]efresh (?:the Order of|an? [^.\n]{0,25}'s Order)",
             r"^Order\b|\bOrder( \([^)]*\))?:", None),
    'boosted': ('ถูก boost', r"\b[Bb]oost (?:all|each|every|\d+|both|adjacent|your|the) (?:other )?(?:allied |adjacent )?(?:units|copies)\b|\b[Bb]oost (?:all|each|\d+)[^.\n]{0,25}\ballied\b|\b[Bb]oost a random allied unit\b|\b[Bb]oost (?:all|each) units\b",
                r"\breceives? a boost\b|\bis boosted\b|[Ww]henever[^.\n]{0,30}\bboosted\b|^Inspired\b|\(Inspired\)|\bInspired:", None),
    'edmg': ('ดาเมจศัตรูหลายครั้ง', r"\b[Dd]amage (?:\d+|all|each|every|random|a random|two|three)[^.\n]{0,25}\benemy units?\b|\b[Dd]amage all units\b|\b[Dd]amage[^.\n]{0,40}\b(?:\d+|several|two|three) times\b|\bgive[^.\n]{0,40}\bBleeding\b",
             r"[Ww]henever (?:an|a) (?:enemy )?(?:unit )?(?:enemy unit )?(?:takes damage|is damaged)|[Ww]henever you damage|\bBloodthirst\b", r"from Rain|from your Warriors"),
    'admg': ('ทำดาเมจฝ่ายเรา', r"\b[Dd]amage (?:an?|\d+|all|each)? ?(?:other )?allied units?\b|\b[Dd]amage self\b|\b[Dd]amage (?:adjacent|all) units\b|\b[Dd]amage all units on (?:this|each|both)",
             r"[Ww]hen(?:ever)? (?:this unit|an adjacent unit|an allied unit|a [^.\n]{0,15}allied[^.\n]{0,15}) (?:takes damage|is damaged)|\bBerserk\b", r"reduce its base power"),
    'coin': ('Coin', r"\b[Gg]ains?\b[^.\n]{0,20}\bCoins?\b|\bProfit\b",
             r"\bTribute\b|\bFee\b|\b[Ss]pend\b[^.\n]{0,20}\bCoins?\b", None),
    'hazard': ('Hazard', rf"\b(?:[Aa]pply|[Ss]pawn|[Aa]pplies)\b[^.\n]{{0,40}}\b{HZ}",
               rf"\bhazards?\b|\b(?:row|rows) with (?:a |an )?{HZ}|\b(?:under|affected by) (?:a |an )?{HZ}", None),
    'crew': ('Crew (ยืนระหว่าง Soldier)', r"\bSpawn[^.\n]{0,40}\bSoldiers?\b", r"^Crew\b|\bCrew:", None),
    'bonded': ('Bonded (ก๊อปการ์ด)', r"\b(?:Spawn|Create|Play|Summon)\w* (?:a |an |\d )?(?:base )?cop(?:y|ies) of (?:an?|the|that) (?:allied|bronze|unit)|\b[Dd]uplicate",
               r"^Bonded\b|\bBonded:", None),
}
for S in ST:
    g, u = status_rx(S)
    MECH[S.lower()] = (S, g, u, None)

# คีย์เวิร์ดที่การ์ดอื่น "อ้าง" ได้ (เช่น "Whenever you play a unit with Formation") -> คู่กับใบที่มีคีย์เวิร์ดนั้น
KREF = ['Thrive', 'Harmony', 'Formation', 'Zeal', 'Adrenaline', 'Inspired', 'Devotion', 'Berserk', 'Veteran',
        'Ambush', 'Deathblow', 'Bloodthirst', 'Echo', 'Lineage', 'Symbiosis', 'Resupply', 'Patience', 'Rupture', 'Spring', 'Duel', 'Barricade']


def kref_rx(K):
    use = (rf"(?:\bwith (?:the )?|\byour |\ball |\beach |\bany |\btrigger\w* (?:an? |the |all )?(?:allied )?(?:unit's |units' )?)\"?{K}\b(?!:)"
           rf"|\b{K}\"? (?:units?|cards?|abilit(?:y|ies))\b")
    own = rf"^{K}\b|^[^:\n]{{0,30}}\(\s*{K}[^)]*\):|^[^\n]{{0,40}}\b{K}(?: \d+)?:"
    return use, own


for K in KREF:
    u, o = kref_rx(K)
    MECH['k_' + K.lower()] = (K, u, o, None)   # ฝั่ง "ให้" = ใบที่ต้องการการ์ดมีคีย์เวิร์ด, ฝั่ง "ใช้" = ใบที่มีคีย์เวิร์ด

CMECH = {k: (lab, re.compile(g, re.M), re.compile(u, re.M), re.compile(x) if x else None) for k, (lab, g, u, x) in MECH.items()}


# ---------- polarity: บรรทัดนี้ "ดีกับเรา" (+1) / "ร้ายกับเรา" (-1) / ไม่รู้หรือกลาง (0) ----------
# ดี = boost/spawn/summon/play/draw/create/heal/purify/armor/shield ฯลฯ ที่ทำกับฝ่ายเรา/ตัวเอง หรือ damage/destroy/lock/poison/... กับศัตรู
# ร้าย = กลับข้าง · ประโยคผสม = ถือตามผลแรก (ผลหลัก) แล้วจดลง AMBIG ไว้รายงาน
PFX = re.compile(r"^(?:[A-Z][\w'’ -]{0,30}?(?:\s*\([^)]*\))?(?:\s*\d+)?\s*:\s*|[A-Z]\w+\.\s+)")
COND = re.compile(r"^(?:[Ww]henever|[Ww]hen|[Ee]ach time|[Aa]t the (?:start|end) of|[Ii]f|[Oo]nce|[Aa]fter|[Ww]hile)\b[^,]*,\s*")
VERB = re.compile(r"\b(boost|strengthen|spawn|summon|replay|play|draw|create|heal|purify|resurrect|return|increase|"
                  r"damage|destroy|lock|poison|weaken|banish|seize|reduce|decrease|give|apply|applie|gain)(?:s|es|ed|d)?\b", re.I)
VERBS = {'boost', 'strengthen', 'spawn', 'summon', 'replay', 'play', 'draw', 'create', 'heal', 'purify', 'resurrect', 'return', 'increase',
         'damage', 'destroy', 'lock', 'poison', 'weaken', 'banish', 'seize', 'reduce', 'decrease', 'give', 'apply', 'applie', 'gain', 's', 'es', 'ed', 'd'}
GOODV = {'boost', 'strengthen', 'spawn', 'summon', 'replay', 'play', 'draw', 'create', 'heal', 'purify', 'resurrect', 'return', 'increase'}
BADV = {'damage', 'destroy', 'lock', 'poison', 'weaken', 'banish', 'seize'}
BAD_ST = re.compile(r"\b(?:Bleeding|Poison|Lock|Doomed|Bounty)\b")
GOOD_ST = re.compile(r"\b(?:Shield|Vitality|Resilience|Veil|Armor|Zeal|Charges?|Coins?|power)\b")
HAZ = re.compile(r"\b(?:Frost|Rain|Fog|Storm|Blood Moon|Dragon's Dream|Cataclysm|hazards?)\b")
ENEMY = re.compile(r"\b(?:enemy|enemies|opponent|opponent's|opposite|their)\b", re.I)
ALLY_HINT = re.compile(r"\b(?:allied|self|this unit|your|this row|adjacent|own)\b", re.I)
BOTH = re.compile(r"\b(?:all units|both|either player|each player|all other units)\b", re.I)
OBJ_END = re.compile(r"\b(?:by|equal|for each|for every|if|that|who|with|from|to match|instead|whenever)\b|,")
AMBIG = {}


def _clause_sign(cl, disloyal=False):
    # ดูเฉพาะกริยาที่ "ขึ้นต้นท่อน" (กันคำนามอย่าง "a unit's Lock") · disloyal: ใบที่ลงฝั่งศัตรู -> คำบอกตำแหน่ง
    # (self / this row / opposite row) กลับข้าง แต่คำ enemy/allied ยังนับจากมุมเจ้าของใบ (ตาม brief: Lara = ร้าย)
    pos = -1 if disloyal else 1
    s = cl.strip()
    if re.match(r"(?:[Dd]on't|[Dd]o not|[Cc]annot|[Cc]an't)\b", s): return 0
    forced_enemy = re.match(r"(?:also )?(?:[Yy]our opponent|[Tt]he opponent|[Tt]hey)(?: also)? ", s)
    if forced_enemy: s = s[forced_enemy.end():]
    m = re.match(r"(?:[Aa]lso |[Ii]nstead |[Tt]hen )?" + VERB.pattern, s, re.I)
    if not m: return 0
    v = m.group(1).lower(); rest = s[m.end():]
    if v in ('reduce', 'decrease'):
        sign = 1 if re.match(r"[^.,]{0,30}\b(?:Cooldown|Timer|cost|Fee|Tribute|Counter)\b", rest) else -1
    elif v == 'increase' and re.match(r"[^.,]{0,20}\bduration\b", rest):
        sign = -1      # ยืดเวลา hazard/row effect
    elif v in ('give', 'apply', 'applie', 'gain'):
        sign = -1 if BAD_ST.search(rest) else 1 if GOOD_ST.search(rest) else 0
        if sign == 0: return 0
    elif v in ('spawn', 'create') and HAZ.search(rest[:40]):
        sign = -1      # วาง hazard = ของร้ายกับแถวที่มันลง
    else:
        sign = 1 if v in GOODV else -1
    if forced_enemy:
        return -sign
    if v in ('spawn', 'summon', 'play', 'replay', 'create', 'return'):
        if re.search(r"\b(?:enemy row|opponent's side|their side|their row|opponent's deck|from (?:their|your opponent's) deck)\b", rest, re.I):
            return -sign
        if re.search(r"\bopposite row\b", rest):
            return -sign * pos
    if v == 'gain':
        return sign
    if v in ('give', 'apply', 'applie'):
        stm = BAD_ST.search(rest) or GOOD_ST.search(rest)
        obj = rest[:stm.start()]
    else:
        obj = OBJ_END.split(rest, 1)[0]
    if re.search(r"\b(?:enemy|enemies|opponent|opponent's|their)\b", obj, re.I):
        return -sign
    if re.search(r"\bopposite\b", obj):
        return -sign * pos
    if re.search(r"\ballied\b", obj):
        return sign
    if re.search(r"\badjacent\b", obj) and sign < 0:
        return 0       # "damage adjacent units" ของ special = ข้างเป้า (ศัตรู) · ของยูนิต = ข้างตัวเอง -> ไม่ฟันธง
    if re.search(r"\b(?:this row|same row|adjacent)\b", obj, re.I):
        return sign * pos
    if re.search(r"\b(?:self|this unit|own|your)\b", obj, re.I) or (v in ('reduce', 'decrease') and re.search(r"\bits\b", obj)):
        return sign
    if BOTH.search(obj):
        return 0
    # ไม่ระบุเป้า: กริยาร้าย ("Damage a unit", "Poison it") = ผู้เล่นเลือกเป้าศัตรู · กริยาดี = ฝ่ายเรา
    return 1


def polarity(line, disloyal=False):
    s = re.sub(r'"[^"]*"', ' ', line.strip())    # ข้อความใน Infuse "..." ไม่ใช่ผลของใบนี้
    for _ in range(4):
        n = PFX.sub('', s, 1); n = COND.sub('', n, 1)
        if n == s: break
        s = n
    fe = re.match(r"(?:[Yy]our opponent|[Tt]he opponent|[Tt]hey)(?: also)? ", s)
    if fe:      # "they also replay X and give it Doomed" = ทั้งประโยคเป็นผลของศัตรู -> กลับข้างทั้งก้อน
        inner = re.sub(r"\btheir\b", "your", re.sub(r"\bthe opposite row\b", "this row", s[fe.end():]))   # มุมมองศัตรู
        p = polarity(inner, disloyal)
        AMBIG.pop(inner, None)
        return -p
    parts = [p for p in re.split(r"\.\s+|,? then |;|,? and (?=(?:also )?" + VERB.pattern + r")|, |\.\s*$", s, flags=re.I) if p and p.strip() and p.lower() not in VERBS]
    signs = [_clause_sign(p, disloyal) for p in parts]
    nz = [x for x in signs if x]
    if not nz: return 0
    if len(set(nz)) > 1:
        AMBIG[line] = nz            # ผสม: ส่วนใหญ่เป็น "จ่ายค่า แล้วได้ผล" -> นับว่าไม่ร้าย (0) ไม่ตัดทิ้ง
        return 0
    return nz[0]


def tag_clear_rx(alts):
    # ใบที่ดู "อ้างแท็กชัด": whenever you play a T · for each T · T in your starting deck · boost/give/summon a T · if you control a T
    gap = r"(?:(?!Spawn|Create|spawn|create)[^.,\n]){0,30}?"
    return re.compile(r"(?:\b(?:[Ww]henever|[Ee]ach time|[Ff]or each|number of|[Ii]f you (?:control|have)|allied|[Pp]lays?|played|"
                      r"[Bb]oost|[Gg]ive|[Ss]ummon|[Dd]raw|[Ss]trengthen|[Rr]eturn|unique)\b" + gap + r"\b(?:" + alts + r")\b)"
                      r"|\b(?:" + alts + r")\b[^.\n]{0,15}\bin your (?:starting deck|deck|hand|graveyard)\b")


def lines(txt):
    return [l for l in (txt or '').split('\n') if l.strip()]


def tag_alts(T):
    return {'Elf': 'Elf|Elves|Elven', 'Dwarf': 'Dwarf|Dwarves|Dwarven'}.get(T, re.escape(T) + '(?:s|es)?')


def plural_rx(T):
    return re.compile(r"\b(?:" + tag_alts(T) + r")\b")


def first_line(L, rx, excl=None, pol=None):
    for i, l in enumerate(L):
        if rx.search(l) and not (excl and excl.search(l)) and not (pol and pol[i] < 0):
            return i
    return -1


def mscore(r):
    return SC_M.get(r[1], SC['m']) if r[0] == 'm' else SC[r[0]]


# แท็กที่พูดถึงฝั่งศัตรู ("your opponent plays a Wild Hunt" · "an enemy Elf") ไม่ใช่ synergy กับแท็กของเรา -> ลบออกก่อนหาแท็ก
OPP = re.compile(r"\b(?:[Yy]our opponent|[Tt]he opponent|enemy|opponent's)\b(?:(?!allied|\byour\b)[^.,\n]){0,30}")
STK = {s.lower() for s in ST}


def side(line):
    # สถานะไปลงฝั่งไหน: e = ศัตรู · a = ฝ่ายเรา · None = ไม่ระบุ/ทั้งคู่ (เช่น ให้ Doomed ยูนิตเรา ไม่เข้ากับ "Destroy a Doomed enemy unit")
    e = bool(re.search(r"\b(?:enemy|opponent)\b", line)); a = bool(re.search(r"\b(?:allied|self)\b", line))
    return 'e' if e and not a else 'a' if a and not e else None


def spawn_ok(gl, ul, spawn_tags=None):
    # "Whenever you Spawn a Wandering Treant" = ต้อง Spawn ของนั้นจริง ไม่ใช่ Spawn อะไรก็ได้
    # spawn_tags = {ชื่อการ์ด/token: [แท็ก]} -> "Spawn one or more Insectoids" จับกับใบที่ Spawn Drone (token แท็ก Insectoid) ได้
    m = re.search(r"[Ww]henever you Spawn (?:a |an |one or more )?([A-Z][\w' ]*?)(?:,| on |$)", ul)
    if not m or m.group(1).strip().lower() in ('unit', 'units'): return True
    head = m.group(1).strip().split()[-1]
    head = head[:-3] + 'f' if head.endswith('ves') else head.rstrip('s')
    if re.search(r"\b" + re.escape(head), gl): return True
    for nm, tg in (spawn_tags or {}).items():
        if head in tg and re.search(r"\b(?:Spawn|Create)\w*\b[^.\n]{0,40}\b" + re.escape(nm) + r"(?:s|es)?\b", gl): return True
    return False


ZEAL_OWN = re.compile(r"^Zeal\b|\b[Gg]ain Zeal\b|^[^\n]{0,40}\. Zeal\.")


def compute(cards, kwnames, arch, tokens=None):
    C = [c for c in cards if c['t'] != 'Ability']
    byid = {c['id']: c for c in C}
    ok = lambda a, b: a['f'] == b['f'] or a['f'] == 'Neutral' or b['f'] == 'Neutral'
    ctags = {c['id']: [t.strip() for t in c['cat'].split(',') if t.strip() and t.strip() != 'Leader'] for c in C}
    tags = sorted({t for v in ctags.values() for t in v})
    names = sorted({c['n'] for c in C if c['n'] not in tags and c['n'] not in kwnames and len(c['n']) > 3}, key=len, reverse=True)
    byname = {}
    for c in C: byname.setdefault(c['n'], []).append(c)
    nrx = re.compile(r"(?<![\w'])(?:" + '|'.join(re.escape(n) for n in names) + r")(?![\w'])")
    trx = {T: plural_rx(T) for T in tags}
    tclr = {T: tag_clear_rx(tag_alts(T)) for T in tags}
    spawn_tags = {}     # ชื่อ -> แท็ก ของทั้งการ์ดและ token (token ไม่อยู่ใน C แต่ถูก Spawn ได้)
    for c in list(C) + list((tokens or {}).values()):
        tg = [t.strip() for t in (c.get('cat') or '').split(',') if t.strip()]
        if tg and len(c['n']) > 3: spawn_tags.setdefault(c['n'], set()).update(tg)
    facs = sorted({c['f'] for c in C})
    # ขนาดกลุ่มแท็ก: ฝ่าย X + Neutral (ใบ Neutral ดูได้ทุกฝ่าย = นับทั้งหมด)
    pool = {}
    for T in tags:
        tot = sum(1 for c in C if T in ctags[c['id']])
        neu = sum(1 for c in C if T in ctags[c['id']] and c['f'] == 'Neutral')
        for F in facs:
            pool[(F, T)] = tot if F == 'Neutral' else neu + sum(1 for c in C if T in ctags[c['id']] and c['f'] == F)
    prim_cnt = {}
    for c in C:
        if c['t'] == 'Unit' and c['f'] != 'Neutral' and ctags[c['id']]:
            k = (c['f'], ctags[c['id']][0]); prim_cnt[k] = prim_cnt.get(k, 0) + 1

    L = {c['id']: lines(c['ab']) for c in C}
    AMBIG.clear()
    POL = {c['id']: [polarity(l, any(x.strip() == 'Disloyal.' for x in L[c['id']])) for l in L[c['id']]] for c in C}
    give = {}; use = {}; ment = {}; ment_t = {}; clr_t = {}
    for c in C:
        Lc = L[c['id']]
        give[c['id']] = {}; use[c['id']] = {}
        has_zeal = any(ZEAL_OWN.search(l) for l in Lc)
        disl = any(l.strip() == 'Disloyal.' for l in Lc)
        for k, (lab, g, u, x) in CMECH.items():
            i = first_line(Lc, g)
            j = first_line(Lc, u, x, POL[c['id']])   # บรรทัดผลร้ายห้ามเป็นฝั่ง "ใช้" (ไม่อยากให้มันทำงาน)
            # Zeal: ฝั่งรับ = ยูนิตมี Order ยังไม่มี Zeal และ Order ไม่ได้วิ่งด้วย Charges (ตัวจำกัดคือจำนวน Charge ไม่ใช่การรอ 1 เทิร์น)
            if k == 'zeal' and (c['t'] != 'Unit' or has_zeal or any(re.match(r"Charges?:? \d", l) for l in Lc)): j = -1
            if k == 'dw' and disl: j = -1        # Disloyal อยู่ฝั่งศัตรู ตัว trigger/Consume "allied" ของเราแตะไม่ได้
            if k == 'grave' and j >= 0 and i == j: i = -1
            if i >= 0: give[c['id']][k] = i
            if j >= 0: use[c['id']][k] = j
        ment[c['id']] = {}
        for i, l in enumerate(Lc):
            for n in nrx.findall(l): ment[c['id']].setdefault(n, i)
        ment_t[c['id']] = {}
        for i, l in enumerate(Lc):
            s = OPP.sub(' ', nrx.sub(' ', l).replace("Dragon's Dream", ' '))
            for T in tags:
                if T not in ment_t[c['id']] and trx[T].search(s): ment_t[c['id']][T] = i
        clr_t[c['id']] = {}
        for i, l in enumerate(Lc):
            s = OPP.sub(' ', nrx.sub(' ', l).replace("Dragon's Dream", ' '))
            for T in tags:
                if T not in clr_t[c['id']] and tclr[T].search(s): clr_t[c['id']][T] = i

    def gate(line, b):
        # ข้อจำกัดในบรรทัดฝั่ง "ให้" ของ Zeal/Charge/Cooldown: bronze/gold · non-Neutral · แท็ก (เช่น allied Machines)
        if re.search(r"\bbronze\b", line) and b['c'] != 'Bronze': return False
        if re.search(r"\bgold\b", line) and b['c'] != 'Gold': return False
        if re.search(r"\bnon-Neutral\b", line) and b['f'] == 'Neutral': return False
        nm = nrx.findall(line)
        if nm and b['n'] not in nm: return False      # ให้ใบที่ระบุชื่อเท่านั้น (เช่น Bjorn's Drakkar)
        s = nrx.sub(' ', line)
        want = [T for T in tags if trx[T].search(s)]
        return not want or any(T in ctags[b['id']] for T in want)

    P = {}
    def add(a, b, r):
        if a['id'] == b['id'] or b['id'] in a['rel'] or not ok(a, b): return
        Lr = P.setdefault((a['id'], b['id']), [])
        if not any(x[0] == r[0] and x[1] == r[1] for x in Lr): Lr.append(r)

    for a in C:
        A = a['id']
        for n, i in ment[A].items():
            for b in byname.get(n, []):
                add(a, b, ['n', '', i, -1]); add(b, a, ['n', '', -1, i])
        for T, i in ment_t[A].items():
            pa = pool[(a['f'], T)]
            if pa > TAG_HARD: continue
            if pa > TAG_CAP:
                if T not in clr_t[A]: continue      # แท็กใหญ่: จับเฉพาะตอนอ้างชัด แล้วไปจัดอันดับตอนเรียง
                i = clr_t[A][T]
            for b in C:
                if T in ctags[b['id']]:
                    jb = clr_t[b['id']].get(T, -1) if pa > TAG_CAP else -1
                    add(a, b, ['t', T, i, jb])          # jb >= 0 = คู่ก็อ้างแท็ก T เหมือนกัน (tribal)
                    if pa <= TAG_CAP and pool[(b['f'], T)] <= TAG_CAP: add(b, a, ['tr', T, -1, i])
        for k, i in give[A].items():
            for b in C:
                j = use[b['id']].get(k, -1)
                if j < 0: continue
                if b['id'] == A: continue
                if k in ('zeal', 'charge', 'cooldown') and not gate(L[A][i], b): continue
                if k in STK and side(L[A][i]) and side(L[b['id']][j]) and side(L[A][i]) != side(L[b['id']][j]): continue
                if k == 'spawn' and not spawn_ok(L[A][i], L[b['id']][j], spawn_tags): continue
                lab = k
                add(a, b, ['m', lab, i, j]); add(b, a, ['m', lab, j, i])
        if 'k_harmony' in use[A]:
            for b in C:
                tb = ctags[b['id']]
                if b['t'] == 'Unit' and b['f'] != 'Neutral' and tb and prim_cnt.get((b['f'], tb[0]), 99) <= HARMONY_RARE:
                    add(a, b, ['h', tb[0], use[A]['k_harmony'], -1]); add(b, a, ['h', tb[0], -1, use[A]['k_harmony']])
    if arch:
        for f, arr in arch.items():
            for ar in arr or []:
                ks = [byid[int(k)] for k in ar.get('key_cards', []) if str(k).isdigit() and int(k) in byid]
                for a in ks:
                    for b in ks: add(a, b, ['a', ar.get('name', ''), -1, -1])

    out = {}
    for (a, b), rs in P.items():
        s = sum(SC_TRC if (r[0] == 'tr' and r[1] in clr_t[b]) else mscore(r) for r in rs)
        if s >= MIN_SCORE: out.setdefault(a, []).append((b, rs, s))

    def rank(a, x):
        b, rs, s = x; B = byid[b]
        big = any(r[0] == 't' and pool[(byid[a]['f'], r[1])] > TAG_CAP for r in rs)
        if big:
            # แท็กใหญ่: tribal ก่อน > มีกลไกส่งต่อ (อยู่ในคะแนนแล้ว) > ฝ่ายเดียวกันก่อน Neutral > provision ต่ำก่อน
            trib = any(r[0] == 't' and r[3] >= 0 for r in rs)
            return (-(s + (TRIBAL_BONUS if trib else 0)), 0 if B['f'] == byid[a]['f'] else 1, B['v'], B['n'])
        return (-s, 0 if B['c'] == 'Gold' else 1, -B['v'], B['n'])
    res = {}
    for a, lst in out.items():
        lst.sort(key=lambda x: rank(a, x))
        # เรียงเหตุผล: น้ำหนักมากก่อน
        # [คู่, เหตุผล, คะแนน] · คะแนน = ผลรวมน้ำหนักเหตุผล (ไม่รวม TRIBAL_BONUS) ใช้ตอนแนะนำการ์ดเข้าเดค (src/lib/recommend.ts)
        res[a] = [[b, sorted(rs, key=lambda r: -mscore(r)), s] for b, rs, s in lst[:MAX_PAIRS]]
    labels = {k: v[0] for k, v in MECH.items()}
    amb = dict(AMBIG)
    lres = leader_pairs(cards, C, byname, nrx, trx, tclr, tags, ctags, pool, give, use, L, gate, spawn_tags, ok)
    AMBIG.clear(); AMBIG.update(amb)     # polarity ของ leader ไม่ปนกับรายงาน AMBIG ของการ์ดปกติ
    return res, labels, lres, {'TAG_CAP': TAG_CAP, 'MIN_SCORE': MIN_SCORE, 'pool': pool, 'give': give, 'use': use, 'pol': POL, 'ambig': dict(AMBIG)}


# ---------- leader ability -> การ์ด (เพิ่ม 18 ต.ค. 2026) ----------
# leader ไม่ได้อยู่ใน C เลยไม่กระทบคู่ของการ์ดปกติเลย (pr ของ 1025 ใบคงเดิมทุกตัว) · คิดทางเดียว leader -> การ์ด
# ด้วยกฎชุดเดียวกัน: เอ่ยชื่อ (n) · แท็กที่ leader อ้าง (t) · กลไก give/use ทั้งสองทิศ (m) + polarity/side/gate/spawn_ok
# ไม่มี tr (leader ไม่มีแท็กให้ใครอ้าง) · ไม่มี h/a (leader ไม่มี Harmony และไม่อยู่ใน key_cards)
# เก็บแยกเป็น lp ของใบ leader (ไม่ใช่ pr) -> modal ไม่แสดง "เล่นคู่กับ" ของ leader · ใช้แค่ตอนแนะนำการ์ดเข้าเดค
LEADER_MAX_PAIRS = 30   # ไม่ได้โชว์ใน modal เลยเก็บมากกว่า 8 ได้ · พอให้กล่องแนะนำมีของครบ 10 ใบหลังกรองใบที่ใส่ไม่ได้


def leader_pairs(cards, C, byname, nrx, trx, tclr, tags, ctags, pool, give, use, L, gate, spawn_tags, ok):
    res = {}
    for ld in (c for c in cards if c['t'] == 'Ability'):
        A = ld['id']; La = lines(ld['ab'])
        pol = [polarity(l) for l in La]
        ctags.setdefault(A, [])                 # gate() ของฝั่งการ์ดอ้างแท็กของ "ผู้รับ" · leader ไม่มีแท็ก
        g = {}; u = {}
        for k, (lab, gx, ux, x) in CMECH.items():
            i = first_line(La, gx); j = first_line(La, ux, x, pol)
            if k == 'zeal': j = -1                # ฝั่งรับ Zeal ต้องเป็นยูนิต
            if k == 'grave' and j >= 0 and i == j: i = -1
            if i >= 0: g[k] = i
            if j >= 0: u[k] = j
        P = {}

        def add(b, r):
            if b['id'] in ld['rel'] or not ok(ld, b): return
            Lr = P.setdefault(b['id'], [])
            if not any(x[0] == r[0] and x[1] == r[1] for x in Lr): Lr.append(r)
        for i, l in enumerate(La):
            for n in nrx.findall(l):
                for b in byname.get(n, []): add(b, ['n', '', i, -1])
        seen = {}; clr = {}
        for i, l in enumerate(La):
            s = OPP.sub(' ', nrx.sub(' ', l).replace("Dragon's Dream", ' '))
            for T in tags:
                if T not in seen and trx[T].search(s): seen[T] = i
                if T not in clr and tclr[T].search(s): clr[T] = i
        for T, i in seen.items():
            pa = pool[(ld['f'], T)]
            if pa > TAG_HARD: continue
            if pa > TAG_CAP:
                if T not in clr: continue
                i = clr[T]
            for b in C:
                if T in ctags[b['id']]: add(b, ['t', T, i, -1])
        for k, i in g.items():                  # leader ให้ -> การ์ดใช้
            for b in C:
                j = use[b['id']].get(k, -1)
                if j < 0: continue
                if k in ('zeal', 'charge', 'cooldown') and not gate(La[i], b): continue
                if k in STK and side(La[i]) and side(L[b['id']][j]) and side(La[i]) != side(L[b['id']][j]): continue
                if k == 'spawn' and not spawn_ok(La[i], L[b['id']][j], spawn_tags): continue
                add(b, ['m', k, i, j])
        for k, j in u.items():                  # การ์ดให้ -> leader ใช้
            for b in C:
                i = give[b['id']].get(k, -1)
                if i < 0: continue
                if k in ('zeal', 'charge', 'cooldown') and not gate(L[b['id']][i], ld): continue
                if k in STK and side(L[b['id']][i]) and side(La[j]) and side(L[b['id']][i]) != side(La[j]): continue
                if k == 'spawn' and not spawn_ok(L[b['id']][i], La[j], spawn_tags): continue
                add(b, ['m', k, j, i])
        byid = {c['id']: c for c in C}
        lst = [(b, rs, sum(mscore(r) for r in rs)) for b, rs in P.items()]
        lst = [x for x in lst if x[2] >= MIN_SCORE]
        # เรียงเหมือน rank() ของการ์ดปกติ: คะแนน > ฝ่ายเดียวกันก่อน Neutral > Gold > provision มาก > ชื่อ
        lst.sort(key=lambda x: (-x[2], 0 if byid[x[0]]['f'] == ld['f'] else 1, 0 if byid[x[0]]['c'] == 'Gold' else 1, -byid[x[0]]['v'], byid[x[0]]['n']))
        if lst: res[A] = [[b, sorted(rs, key=lambda r: -mscore(r)), s] for b, rs, s in lst[:LEADER_MAX_PAIRS]]
    return res
