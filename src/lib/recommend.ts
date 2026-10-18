// "แนะนำให้เพิ่ม" — rank cards to add next. Deterministic, no AI: every number comes from card data
// (pair scores computed from card text in pipeline/pairs.py, curated archetypes, deck counts/provisions).
//
// score(X) = (pairs + leader + archetype) × units adjustment × provision adjustment
//   pairs     = Σ over cards A in the deck of copies(A) × pairScore(A, X)        (main signal, unchanged from v1)
//   leader    = W_LEADER × pairScore(leader, X)                                  (main signal, pairs.py leader_pairs)
//   archetype = ARCH_BONUS if X is a key card of the deck's archetype, not yet in the deck (supporting signal)
//   the two adjustments only scale what the first three found — a card with no reason at all never shows up.
//
// pairScore is symmetric: the pipeline keeps only the top 8 pairs per card, so a pair can be listed under
// A only, under X only, or under both — we take the larger of the two scores (never add them twice).
import type { Archetype, Archetypes, Card, Deck, PairReason } from '../types'
import { blockWhy, deckTot, DECK_MIN, UNIT_MIN } from './deckRules'

// ---------- weights (all deterministic constants) ----------
/** The leader counts like one more card in the deck (×1, same footing as a deck card's pair). It is there every game,
 *  but one leader line ("whenever you play an Organic card") matches dozens of cards at once — weighting it higher
 *  (tried 1.5 and 2) buried the cards the player picked on purpose (King Chrum → Ogroids, 40 each) under every
 *  Organic special. At ×1 a leader mechanism pair (60, e.g. Blood Scent → Bleeding) still beats a plain tag pair (40). */
export const W_LEADER = 1
/** A key card of the archetype the deck is going for. 60 = one specific mechanism pair in pairs.py (SC['m']):
 *  enough to surface key cards on its own, but two or three real pairs with the deck still outrank it. */
export const ARCH_BONUS = 60
/** Units: share of the remaining slots that must still be units to reach 13 (need ÷ slots left).
 *  From 0.6 up the deck is squeezed: units are scaled ×(1 + share), other cards ×(1 − share) — at share ≥ 1
 *  non-units drop out. An empty deck (13 of 25 = 0.52) is not squeezed yet. */
export const UNIT_SQUEEZE = 0.6
/** Provision fit (only once a leader is set — no leader = no real cap, same as blockWhy — and the deck has FIT_FROM
 *  cards: early on the target is just cap ÷ 25 ≈ 6.6 for every deck and would only push cheap filler):
 *  target = (cap − used) ÷ (25 − cards). Cards within ±FIT_TOL of it get ×FIT_BONUS — a nudge, not a driver.
 *  The hard check (skip a card that leaves the other slots too few provisions) runs from the first card. */
export const FIT_FROM = 12
export const FIT_TOL = 1.5
export const FIT_BONUS = 1.2

/** a → b → [score, reasons] for every pair listed in cards.json (one direction, as stored) · leaders come from `lp` */
export type PairIndex = Map<number, Map<number, [number, PairReason[]]>>

export function buildPairIndex(cards: Card[]): PairIndex {
  const ix: PairIndex = new Map()
  for (const c of cards) {
    const list = c.pr?.length ? c.pr : c.lp?.length ? c.lp : null
    if (!list) continue
    const m = new Map<number, [number, PairReason[]]>()
    for (const [b, rs, s] of list) m.set(b, [s, rs])
    ix.set(c.id, m)
  }
  return ix
}

/** symmetric pair score between a and b (0 = not paired) + the reasons of the side that gave it */
export function pairScore(ix: PairIndex, a: number, b: number): [number, PairReason[]] {
  const ab = ix.get(a)?.get(b), ba = ix.get(b)?.get(a)
  if (ab && (!ba || ab[0] >= ba[0])) return ab
  if (ba) return [ba[0], ba[1]]
  return [0, []]
}

export interface RecVia { id: number; score: number; reason: PairReason | null }
/** one reason badge: pair 🔗 · leader 👑 · arch 🧩 · units ⚖️ · prov ⚖️ — `w` = points it added (badges sorted by it) */
export type RecTag = { k: 'pair' | 'leader' | 'arch' | 'units' | 'prov'; w: number }
export interface RecItem {
  card: Card; score: number; via: RecVia[]
  leader: { score: number; reason: PairReason | null } | null
  arch: Archetype | null
  tags: RecTag[]
}
export interface RecOpts {
  /** only cards the collection has more copies of than the deck already uses */
  ownedOnly?: boolean
  owned?: (id: number) => number
  limit?: number
  /** curated archetypes (src/data/archetypes.json) — without it the archetype signal is off */
  arch?: Archetypes
}

const ORDER = (a: RecItem, b: RecItem) =>
  b.score - a.score || Number(b.card.c === 'Gold') - Number(a.card.c === 'Gold') || b.card.v - a.card.v || a.card.id - b.card.id

const keyIds = (a: Archetype) => (a.key_cards || []).map(Number).filter(n => Number.isFinite(n))

/**
 * The archetype the deck is going for: the one of the deck's faction whose key cards the deck holds the most of.
 * Needs ≥ 2 key cards in the deck, or 1 clear core card: a Gold key card no other archetype of the faction lists,
 * or the chosen leader (archetype names start with the leader they are built around, e.g. "White Frost").
 * Ties → first in the file. Null when nothing qualifies.
 */
export function deckArchetype(deck: Deck, byId: Record<number, Card>, arch: Archetypes | undefined): Archetype | null {
  const list = (arch && deck.f && arch[deck.f]) || []
  if (!list.length) return null
  const L = deck.L ? byId[deck.L] : null
  let best: Archetype | null = null, bestN = 0
  for (const a of list) {
    const ks = keyIds(a)
    const inDeck = ks.filter(id => (deck.c[id] || 0) > 0)
    const core = inDeck.some(id => byId[id]?.c === 'Gold' && list.every(o => o === a || !keyIds(o).includes(id)))
    const lead = !!L && a.name.toLowerCase().includes(L.n.toLowerCase())
    if (!(inDeck.length >= 2 || core || lead)) continue
    const n = inDeck.length + (lead ? 1 : 0)
    if (n > bestN) { best = a; bestN = n }
  }
  return best
}

/**
 * Cards to add next, best first (max `limit`, default 10).
 * Skips cards that can't be added now (blockWhy: wrong faction, copies full, provision over the cap once a leader is set),
 * leader abilities, tokens (not in `cards`), and cards with no reason at all.
 * With a leader set it also skips cards that would leave too few provisions for the slots still to fill.
 * Empty deck + leader → recommends from the leader and the leader's archetype. Empty deck, no leader → nothing.
 * Ties: Gold first, then higher provision, then id.
 */
export function recommend(deck: Deck, byId: Record<number, Card>, cards: Card[], ix: PairIndex, opts: RecOpts = {}): RecItem[] {
  if (!deck.f) return []
  const anchors: [number, number][] = Object.keys(deck.c).map(Number).filter(i => byId[i] && deck.c[i] > 0).map(i => [i, deck.c[i]])
  const L = deck.L && byId[deck.L] ? byId[deck.L] : null
  if (!anchors.length && !L) return []
  const T = deckTot(deck, byId)
  const ar = deckArchetype(deck, byId, opts.arch)
  const arKeys = new Set(ar ? keyIds(ar) : [])

  // balance inputs
  const slots = DECK_MIN - T.n
  const share = slots > 0 && T.u < UNIT_MIN ? (UNIT_MIN - T.u) / slots : 0
  const squeeze = share >= UNIT_SQUEEZE
  // cheapest card that can fill a slot · Stratagems (provision 0) are left out: a deck runs at most one of them
  const pool = cards.filter(c => c.t !== 'Ability' && c.t !== 'Stratagem' && !c.tok && (c.f === deck.f || c.f === 'Neutral'))
  const minV = pool.length ? Math.min(...pool.map(c => c.v)) : 0
  const left = T.cap - T.pv
  const target = L && slots > 0 && T.n >= FIT_FROM ? left / slots : null

  const out: RecItem[] = []
  for (const x of cards) {
    if (x.t === 'Ability' || x.tok) continue
    if (blockWhy(x, deck, byId)) continue
    if (opts.ownedOnly && opts.owned && opts.owned(x.id) <= (deck.c[x.id] || 0)) continue
    // would leave the remaining slots unable to reach 25 cards even with the cheapest cards
    if (L && slots > 0 && left - x.v < (slots - 1) * minV) continue

    let pair = 0; const via: RecVia[] = []
    for (const [a, k] of anchors) {
      if (a === x.id) continue
      const [s, rs] = pairScore(ix, a, x.id)
      if (!s) continue
      pair += k * s; via.push({ id: a, score: k * s, reason: rs[0] || null })
    }
    via.sort((p, q) => q.score - p.score || byId[p.id].n.localeCompare(byId[q.id].n))
    let leader: RecItem['leader'] = null
    if (L) { const [s, rs] = pairScore(ix, L.id, x.id); if (s) leader = { score: W_LEADER * s, reason: rs[0] || null } }
    const archHit = arKeys.has(x.id) && !deck.c[x.id]
    const base = pair + (leader?.score || 0) + (archHit ? ARCH_BONUS : 0)
    if (!base) continue

    const tags: RecTag[] = []
    if (pair) tags.push({ k: 'pair', w: pair })
    if (leader) tags.push({ k: 'leader', w: leader.score })
    if (archHit) tags.push({ k: 'arch', w: ARCH_BONUS })
    let score = base
    if (squeeze) {
      const s1 = x.t === 'Unit' ? score * (1 + share) : score * Math.max(0, 1 - share)
      if (s1 > score) tags.push({ k: 'units', w: s1 - score })
      score = s1
    }
    if (target !== null && Math.abs(x.v - target) <= FIT_TOL) {
      const s2 = score * FIT_BONUS
      if (s2 > score) tags.push({ k: 'prov', w: s2 - score })
      score = s2
    }
    if (score <= 0) continue
    score = Math.round(score * 100) / 100
    tags.sort((p, q) => q.w - p.w)
    out.push({ card: x, score, via, leader, arch: archHit ? ar : null, tags })
  }
  return out.sort(ORDER).slice(0, opts.limit ?? 10)
}

/** short label for why a pair works, e.g. "Bleeding", "Ogroid", "เอ่ยชื่อ" */
export function reasonLabel(r: PairReason | null, plbl: Record<string, string>): string {
  if (!r) return ''
  const [k, x] = r
  if (k === 'm') return plbl[x] || x
  if (k === 't' || k === 'tr' || k === 'h') return x
  if (k === 'n') return 'เอ่ยชื่อ'
  if (k === 'a') return 'เดคแนว ' + x
  return k
}
