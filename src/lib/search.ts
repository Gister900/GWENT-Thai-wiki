import type { Card } from '../types'

/** lower-cased haystack: name + EN ability + TH ability + tags + type + faction */
export const searchKey = (c: Card) => (c.n + ' ' + c.ab + ' ' + c.abT + ' ' + c.cat + ' ' + c.t + ' ' + c.f).toLowerCase()

/** search input → query (trimmed, lower-cased) */
export const normQuery = (s: string) => s.trim().toLowerCase()

export type SortKey = 'fac' | 'provD' | 'provA' | 'powD' | 'name'
export function sorter(key: SortKey, facIdx: (c: Card) => number): (a: Card, b: Card) => number {
  switch (key) {
    case 'fac': return (a, b) => facIdx(a) - facIdx(b) || b.v - a.v || a.n.localeCompare(b.n)
    case 'provD': return (a, b) => b.v - a.v || a.n.localeCompare(b.n)
    case 'provA': return (a, b) => a.v - b.v || a.n.localeCompare(b.n)
    case 'powD': return (a, b) => b.p - a.p || b.v - a.v || a.n.localeCompare(b.n)
    case 'name': return (a, b) => a.n.localeCompare(b.n)
  }
}

export interface CardFilter { fac: Set<string>; type: Set<string>; col: Set<string>; q: string; pmin: number; pmax: number; star: boolean; tip: boolean }

/** all-cards tab filter · tipped = the card has its own tip (cardTips.json) — used by the 💡 มีทริก chip */
export function matchCard(c: Card, st: CardFilter, key: string, starred: boolean, tipped: boolean): boolean {
  return (!st.fac.size || st.fac.has(c.f) || (!!c.f2 && st.fac.has(c.f2))) && (!st.type.size || st.type.has(c.t)) && (!st.col.size || st.col.has(c.c))
    && c.v >= st.pmin && c.v <= st.pmax && (!st.q || key.includes(st.q)) && (!st.star || starred) && (!st.tip || tipped)
}

export interface PickFilter { q: string; col: string; type: string; prov: string; own: '' | 'has' | 'none' }

/** deck picker: deck faction + Neutral, no leaders, own faction first then provision high→low then name */
export function pickCards(cards: Card[], fac: string, pf: PickFilter, key: (c: Card) => string, owned: (id: number) => number): Card[] {
  let lo = 0, hi = 99; if (pf.prov) { [lo, hi] = pf.prov.split('-').map(Number) }
  return cards.filter(c => c.t !== 'Ability' && (c.f === fac || c.f === 'Neutral') && (!pf.col || c.c === pf.col) && (!pf.type || c.t === pf.type) && c.v >= lo && c.v <= hi
    && (!pf.q || key(c).includes(pf.q)) && (!pf.own || (pf.own === 'has' ? owned(c.id) > 0 : owned(c.id) === 0)))
    .sort((a, b) => Number(a.f === 'Neutral') - Number(b.f === 'Neutral') || b.v - a.v || a.n.localeCompare(b.n))
}
