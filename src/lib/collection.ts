import type { Card, Own } from '../types'

/** copies you can own/use: Bronze 2 · otherwise 1 */
export const maxCopiesC = (c: Pick<Card, 'c'>) => (c.c === 'Bronze' ? 2 : 1)

/** owned copies, clamped to 0..max (unknown ids → 0) */
export const ownN = (own: Own, id: number, byId: Record<number, Card>) => Math.max(0, Math.min(+(own[id] || 0), byId[id] ? maxCopiesC(byId[id]) : 0))

export function setOwn(own: Own, id: number, n: number): Own {
  const o = { ...own }; if (n > 0) o[id] = n; else delete o[id]; return o
}

/** next value when the "มี n/m" button is pressed: 0 → 1 → … → max → 0 */
export const nextOwn = (n: number, c: Card) => (n + 1) % (maxCopiesC(c) + 1)

export type OwnFilter = '' | 'full' | 'miss' | 'none'
/** collection filter on the all-cards tab (leader abilities never match a non-empty filter) */
export function ownOk(f: OwnFilter, c: Card, n: number): boolean {
  if (!f) return true
  if (c.t === 'Ability') return false
  const m = maxCopiesC(c)
  return f === 'full' ? n >= m : f === 'miss' ? n < m : n === 0
}

export function ownSummaryText(cards: Card[], own: Own, byId: Record<number, Card>): string {
  const cs = cards.filter(c => c.t !== 'Ability')
  const full = cs.filter(c => ownN(own, c.id, byId) >= maxCopiesC(c)).length
  const some = cs.filter(c => ownN(own, c.id, byId) > 0).length
  return `มีครบ ${full} ใบ · มีอย่างน้อย 1 ก๊อป ${some} ใบ จาก ${cs.length} ใบ`
}

export const exportPayload = (own: Own, now: Date) => ({ type: 'gwent-collection', version: 1, exported: now.toISOString(), own })

/** parse an exported collection file; throws when the shape is wrong. Drops unknown ids, leaders, n<=0; clamps to max. */
export function parseImport(text: string, byId: Record<number, Card>): Own {
  const d = JSON.parse(text); const o = d && d.own
  if (!o || typeof o !== 'object') throw new Error('not a collection file')
  const clean: Own = {}
  for (const k in o) { const c = byId[+k]; const n = +o[k]; if (c && c.t !== 'Ability' && n > 0) clean[+k] = Math.min(n, maxCopiesC(c)) }
  return clean
}
