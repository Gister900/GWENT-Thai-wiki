import type { Card, Deck } from '../types'
import { FAC } from './constants'

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
/** why this card can't be added now (null = can add) · s = short badge text, l = full sentence for toast */
export function blockWhy(c: Card, deck: Deck, byId: Record<number, Card>): Block | null {
  if (!deck.f) return { s: 'ยังไม่เลือกฝ่าย', l: 'ยังไม่ได้เลือกฝ่ายของเดค ไปเลือกที่แท็บ "จัดเดค" ก่อน' }
  if (c.f !== deck.f && c.f !== 'Neutral') return { s: 'คนละฝ่าย', l: `${c.n} เป็นการ์ด ${FAC[c.f].th} ใส่ในเดค ${FAC[deck.f].th} ไม่ได้ (ได้แค่ฝ่ายเดียวกันกับ Neutral)` }
  const n = deck.c[c.id] || 0, m = maxCopies(c)
  if (n >= m) return { s: `ใส่ครบ ${m} ใบแล้ว`, l: `${c.c} ใส่ได้ใบละ ${m} ใบ และในเดคมีครบ ${n} ใบแล้ว` }
  const T = deckTot(deck, byId)
  if (T.L && T.pv + c.v > T.cap) return { s: `provision เกิน (เหลือ ${Math.max(0, T.cap - T.pv)})`, l: `provision จะเป็น ${T.pv + c.v} เกินเพดาน ${T.cap} (เหลือที่ว่าง ${Math.max(0, T.cap - T.pv)} แต่ใบนี้ใช้ ${c.v})` }
  return null
}

export interface AddResult { ok: boolean; deck: Deck; msg: string; added: boolean }
/** try to add one copy (or set leader for a leader ability); returns the new deck + toast message */
export function addToDeck(deck: Deck, id: number, byId: Record<number, Card>): AddResult | null {
  const c = byId[id]; if (!c) return null
  if (!deck.f) return { ok: false, deck, added: false, msg: '⛔ ยังไม่ได้เลือกฝ่ายของเดค ไปเลือกที่แท็บ "จัดเดค" ก่อน' }
  if (c.t === 'Ability') {
    if (c.f !== deck.f) return { ok: false, deck, added: false, msg: `⛔ ${c.n} เป็น leader ของ ${FAC[c.f].th} ใช้กับเดค ${FAC[deck.f].th} ไม่ได้` }
    return { ok: true, deck: { ...deck, L: id }, added: false, msg: `✓ ตั้ง ${c.n} เป็น leader แล้ว` }
  }
  const why = blockWhy(c, deck, byId)
  if (why) return { ok: false, deck, added: false, msg: `⛔ เพิ่ม ${c.n} ไม่ได้ · ${why.l}` }
  const next: Deck = { ...deck, c: { ...deck.c, [id]: (deck.c[id] || 0) + 1 } }
  return { ok: true, deck: next, added: true, msg: `✓ เพิ่ม ${c.n} แล้ว · ${deckTot(next, byId).n}/${DECK_MIN} ใบ` }
}

/** remove one copy (no-op when not in deck) */
export function removeFromDeck(deck: Deck, id: number): Deck {
  if (!deck.c[id]) return deck
  const c = { ...deck.c }; c[id]--; if (!c[id]) delete c[id]
  return { ...deck, c }
}

/** deck checklist: [passed, label] */
export function deckChecks(deck: Deck, t: DeckTotals): [boolean, string][] {
  return [[!!deck.f, 'เลือกฝ่ายแล้ว'], [!!t.L, 'เลือก leader ability แล้ว'], [t.n >= DECK_MIN, `การ์ดอย่างน้อย ${DECK_MIN} ใบ (มี ${t.n})`], [t.u >= UNIT_MIN, `ยูนิตอย่างน้อย ${UNIT_MIN} ใบ (มี ${t.u})`], [t.pv <= t.cap, `provision ไม่เกินเพดาน (${t.pv} / ${t.cap})`]]
}
