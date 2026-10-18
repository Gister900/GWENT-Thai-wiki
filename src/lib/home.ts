// Cards home + faction page: pure helpers (which card represents a faction, how a faction is split into sections)
import type { Card } from '../types'

/** card shown behind a faction tile: highest-provision Gold unit of that faction (units have full-bleed art; Specials/Stratagems
 *  only have a card preview) · ties → lowest id, so it never changes between builds */
export function heroCard(cards: Card[], f: string): Card | undefined {
  let best: Card | undefined
  for (const c of cards) if (c.f === f && c.c === 'Gold' && c.t === 'Unit' && (!best || c.v > best.v || (c.v === best.v && c.id < best.id))) best = c
  return best
}

export type SecKey = 'leader' | 'gold' | 'bronze' | 'other'
export const SEC_LBL: Record<SecKey, string> = { leader: 'Leader', gold: 'Gold', bronze: 'Bronze', other: 'การ์ดพิเศษ / Artifact / Stratagem' }
/** Leader = leader abilities · Gold / Bronze = units · other = Special, Artifact, Stratagem of both tiers */
export const secOf = (c: Card): SecKey => (c.c === 'Leader' ? 'leader' : c.t !== 'Unit' ? 'other' : c.c === 'Gold' ? 'gold' : 'bronze')

/** split a (sorted) list into faction sections, keeping the order inside each section */
export function splitSections(cards: Card[]): Record<SecKey, Card[]> {
  const r: Record<SecKey, Card[]> = { leader: [], gold: [], bronze: [], other: [] }
  for (const c of cards) r[secOf(c)].push(c)
  return r
}

/** group a (sorted) list by faction in the given faction order; empty factions are left out */
export function groupByFac(cards: Card[], order: string[]): [string, Card[]][] {
  const m = new Map<string, Card[]>(order.map(f => [f, []]))
  for (const c of cards) m.get(c.f)?.push(c)
  return [...m].filter(([, v]) => v.length > 0)
}
