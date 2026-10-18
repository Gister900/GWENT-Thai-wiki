import type { Card, Deck } from '../types'

export interface CraftRow { c: Card; cum: number; can: boolean }
export interface CraftPlan { items: Card[]; total: number; have: number | null; last: number; rows: CraftRow[] }

/** scraps input text → number (empty → null, negatives → 0) */
export const parseScraps = (raw: string): number | null => (raw === '' ? null : Math.max(0, +raw))

/**
 * Missing copies in the deck, cheapest first. Walking from cheapest, `last` is the index of the last card
 * craftable with `have` scraps (-1 = none); a row is craftable when its running total fits.
 */
export function craftPlan(deck: Deck, byId: Record<number, Card>, owned: (id: number) => number, have: number | null): CraftPlan {
  const ids = Object.keys(deck.c).map(Number).filter(i => byId[i])
  const items: Card[] = []
  ids.forEach(i => { const miss = Math.max(0, deck.c[i] - owned(i)); for (let k = 0; k < miss; k++) items.push(byId[i]) })
  items.sort((a, b) => (a.cc || 0) - (b.cc || 0) || a.n.localeCompare(b.n))
  const total = items.reduce((s, c) => s + (c.cc || 0), 0)
  let cum = 0, last = -1
  const rows = items.map((c, i) => {
    cum += (c.cc || 0); const ok = have !== null && cum <= have; if (ok && last === i - 1) last = i
    return { c, cum, can: have !== null && last >= i }
  })
  return { items, total, have, last, rows }
}

