import type { Card, Deck, Lang } from '../types'
import { FAC } from './constants'
import { ui } from '../i18n/ui'

export const DECK_MIN = 25
export const UNIT_MIN = 13
export const BASE_CAP = 150

/** Bronze: 2 copies · Gold: 1 copy */
export const maxCopies = (c: Pick<Card, 'c'>) => (c.c === 'Bronze' ? 2 : 1)
/** provision a leader ability adds (parsed from text, falls back to its provision value) */
export const leaderAdds = (c: Card) => { const m = /adds (\d+) provision/i.exec(c.ab || ''); return m ? +m[1] : c.v }

export const emptyDeck = (): Deck => ({ f: '', L: null, c: {} })

/** normalize whatever was stored under gwent-deck (same rules as the old page) */
export function normalizeDeck(v: unknown): Deck {
  if (v && typeof v === 'object') { const o = v as Partial<Deck>; return { f: o.f || '', L: o.L || null, c: o.c || {} } }
  return emptyDeck()
}

export interface DeckTotals { n: number; u: number; pv: number; L: Card | null; cap: number }
export function deckTot(deck: Deck, byId: Record<number, Card>): DeckTotals {
  const L = (deck.L && byId[deck.L]) || null
  let n = 0, u = 0, pv = 0
  Object.keys(deck.c).forEach(i => { const k = deck.c[i], c = byId[+i]; if (!c) return; n += k; if (c.t === 'Unit') u += k; pv += k * c.v })
  return { n, u, pv, L, cap: L ? BASE_CAP + leaderAdds(L) : BASE_CAP }
}

export interface Block { s: string; l: string }
/** why this card can't be added now (null = can add) · s = short badge text, l = full sentence for toast (in lang) */
export function blockWhy(c: Card, deck: Deck, byId: Record<number, Card>, lang: Lang = 'th'): Block | null {
  const t = ui(lang).rules
  if (!deck.f) return { s: t.noFacS, l: t.noFacL }
  if (c.f !== deck.f && c.f !== 'Neutral') return { s: t.wrongFacS, l: t.wrongFacL(c.n, FAC[c.f].th, FAC[deck.f].th) }
  const n = deck.c[c.id] || 0, m = maxCopies(c)
  if (n >= m) return { s: t.fullS(m), l: t.fullL(c.c, m, n) }
  const T = deckTot(deck, byId)
  if (T.L && T.pv + c.v > T.cap) { const left = Math.max(0, T.cap - T.pv); return { s: t.overS(left), l: t.overL(T.pv + c.v, T.cap, left, c.v) } }
  return null
}

export interface AddResult { ok: boolean; deck: Deck; msg: string; added: boolean }
/** try to add one copy (or set leader for a leader ability); returns the new deck + toast message */
export function addToDeck(deck: Deck, id: number, byId: Record<number, Card>, lang: Lang = 'th'): AddResult | null {
  const c = byId[id]; if (!c) return null
  const t = ui(lang).rules
  if (!deck.f) return { ok: false, deck, added: false, msg: t.noFacToast }
  if (c.t === 'Ability') {
    if (c.f !== deck.f) return { ok: false, deck, added: false, msg: t.wrongLeader(c.n, FAC[c.f].th, FAC[deck.f].th) }
    return { ok: true, deck: { ...deck, L: id }, added: false, msg: t.setLeader(c.n) }
  }
  const why = blockWhy(c, deck, byId, lang)
  if (why) return { ok: false, deck, added: false, msg: t.cant(c.n, why.l) }
  const next: Deck = { ...deck, c: { ...deck.c, [id]: (deck.c[id] || 0) + 1 } }
  return { ok: true, deck: next, added: true, msg: t.added(c.n, deckTot(next, byId).n, DECK_MIN) }
}

/** remove one copy (no-op when not in deck) */
export function removeFromDeck(deck: Deck, id: number): Deck {
  if (!deck.c[id]) return deck
  const c = { ...deck.c }; c[id]--; if (!c[id]) delete c[id]
  return { ...deck, c }
}

/** deck checklist: [passed, label] */
export function deckChecks(deck: Deck, t: DeckTotals, lang: Lang = 'th'): [boolean, string][] {
  const r = ui(lang).rules
  return [[!!deck.f, r.chkFac], [!!t.L, r.chkLeader], [t.n >= DECK_MIN, r.chkCards(DECK_MIN, t.n)], [t.u >= UNIT_MIN, r.chkUnits(UNIT_MIN, t.u)], [t.pv <= t.cap, r.chkProv(t.pv, t.cap)]]
}
