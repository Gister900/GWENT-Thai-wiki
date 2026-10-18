// Several saved decks (localStorage gwent-decks + gwent-deck-active), the one-time move of the old single deck
// (gwent-deck) into that list, and checking decks that come from outside (import file · share link).
// Pure functions: storage.ts reads/writes the keys, App.tsx keeps the state.
import type { Card, Deck, Lang } from '../types'
import { FAC_ORDER } from './constants'
import { maxCopies, normalizeDeck } from './deckRules'

/** one saved deck in gwent-decks: the old {f, L, c} plus an id, a name and when it was last changed (ms) */
export interface SavedDeck extends Deck { id: string; name: string; updated: number }

/** deck factions (Neutral is not a deck faction) */
export const DECK_FACS = FAC_ORDER.filter(f => f !== 'Neutral')

export const deckName = (lang: Lang, n: number) => (lang === 'en' ? `Deck ${n}` : `เดค ${n}`)

/** automatic names ("เดค 2" / "Deck 2") are shown in the current language; names the user typed stay as they are */
export function showName(name: string, lang: Lang): string { const m = /^(?:เดค|Deck) (\d+)$/.exec(name); return m ? deckName(lang, +m[1]) : name }

/** short random id, unique enough for a handful of decks in one browser */
export const newDeckId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

/** first "เดค N" / "Deck N" name that is not used yet */
export function nextDeckName(decks: { name: string }[], lang: Lang): string {
  const used = new Set(decks.map(d => showName(d.name, lang)))
  for (let n = decks.length + 1; ; n++) if (!used.has(deckName(lang, n))) return deckName(lang, n)
}

/** keep only well-formed entries of a stored list (bad entries are dropped, not repaired into something else) */
export function cleanSaved(v: unknown): SavedDeck[] | null {
  if (!Array.isArray(v)) return null
  const out: SavedDeck[] = []; const ids = new Set<string>()
  for (const x of v) {
    if (!x || typeof x !== 'object') continue
    const o = x as Partial<SavedDeck>
    if (typeof o.id !== 'string' || !o.id || ids.has(o.id)) continue
    ids.add(o.id)
    out.push({ ...normalizeDeck(o), id: o.id, name: typeof o.name === 'string' && o.name.trim() ? o.name : o.id, updated: typeof o.updated === 'number' ? o.updated : 0 })
  }
  return out
}

export interface DeckInit { decks: SavedDeck[]; active: string; /** true = the list was created now (migration / first visit) and should be saved */ created: boolean }

/**
 * Start-up: read gwent-decks. When it is missing (first visit after this update), move the old gwent-deck into the
 * list as "เดค 1" / "Deck 1" (the old key is left as it is, as a backup). Always returns at least one deck.
 * rawDecks / rawActive / rawOld = the raw localStorage strings (null = not set).
 */
export function initDecks(rawDecks: string | null, rawActive: string | null, rawOld: string | null, lang: Lang, now = Date.now(), mkId = newDeckId): DeckInit {
  let decks: SavedDeck[] | null = null
  if (rawDecks !== null) { try { decks = cleanSaved(JSON.parse(rawDecks)) } catch { decks = null } }
  let created = false
  if (!decks || !decks.length) {
    let old: Deck = normalizeDeck(null)
    if (rawOld !== null) { try { old = normalizeDeck(JSON.parse(rawOld)) } catch { /* unreadable old deck: start empty */ } }
    decks = [{ ...old, id: mkId(), name: deckName(lang, 1), updated: now }]
    created = true
  }
  const active = rawActive && decks.some(d => d.id === rawActive) ? rawActive : decks[0].id
  return { decks, active, created }
}

export type DeckErr = 'shape' | 'version' | 'tooMany' | 'faction' | 'leader' | 'card' | 'copies' | 'wrongFac'
export class DeckError extends Error { constructor(public code: DeckErr, public detail = '') { super(code + (detail ? ' ' + detail : '')) } }

/**
 * check a deck that comes from outside (file or link) against the rules: faction is a deck faction, leader is a leader
 * ability of that faction, every card exists and is not a leader, copies within Bronze 2 / Gold 1, card faction = deck
 * faction or Neutral. Throws DeckError; returns a clean {f, L, c} (ids as numbers in string keys like gwent-deck).
 */
export function validateDeck(v: unknown, byId: Record<number, Card>): Deck {
  if (!v || typeof v !== 'object') throw new DeckError('shape')
  const o = v as { f?: unknown; L?: unknown; c?: unknown }
  if (typeof o.f !== 'string' || !DECK_FACS.includes(o.f)) throw new DeckError('faction', String(o.f ?? ''))
  let L: number | null = null
  if (o.L !== null && o.L !== undefined && o.L !== 0) {
    const lc = byId[Number(o.L)]
    if (!lc || lc.t !== 'Ability' || lc.f !== o.f) throw new DeckError('leader', String(o.L))
    L = lc.id
  }
  if (o.c === undefined || o.c === null) o.c = {}
  if (typeof o.c !== 'object' || Array.isArray(o.c)) throw new DeckError('shape')
  const c: Record<string, number> = {}
  for (const k in o.c as Record<string, unknown>) {
    const card = byId[Number(k)]; const n = (o.c as Record<string, unknown>)[k]
    if (!card || card.t === 'Ability') throw new DeckError('card', k)
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > maxCopies(card)) throw new DeckError('copies', card.n)
    if (card.f !== o.f && card.f !== 'Neutral') throw new DeckError('wrongFac', card.n)
    if (n) c[card.id] = n
  }
  return { f: o.f, L, c }
}

/** file made by "Export": {type:"gwent-decks", version:1, exported, decks:[{name, f, L, c}]} */
export const DECKS_FILE = 'gwent-decks'
/** file versions this build can read (a newer site may write a format we do not know yet: refuse it, do not guess) */
export const DECKS_FILE_VERSIONS: readonly unknown[] = [1]
/** most decks one file may add at once */
export const DECKS_FILE_MAX = 200
export const decksExport = (decks: SavedDeck[], now: Date) => ({
  type: DECKS_FILE, version: 1, exported: now.toISOString(),
  decks: decks.map(d => ({ name: d.name, f: d.f, L: d.L, c: d.c })),
})

/** read an exported decks file: every deck must pass validateDeck (one bad deck rejects the file, nothing half-imported) */
export function parseDecksFile(text: string, byId: Record<number, Card>): { name: string; deck: Deck }[] {
  let d: unknown
  try { d = JSON.parse(text) } catch { throw new DeckError('shape') }
  const o = d as { type?: unknown; version?: unknown; decks?: unknown }
  // type → version → shape: a file from a newer site says "newer version", even if its shape changed too
  if (!o || typeof o !== 'object' || o.type !== DECKS_FILE) throw new DeckError('shape')
  if (!DECKS_FILE_VERSIONS.includes(o.version)) throw new DeckError('version', String(o.version ?? ''))
  if (!Array.isArray(o.decks) || !o.decks.length) throw new DeckError('shape')
  if (o.decks.length > DECKS_FILE_MAX) throw new DeckError('tooMany', String(o.decks.length))
  return o.decks.map((x: unknown) => {
    const deck = validateDeck(x, byId)
    const nm = (x as { name?: unknown }).name
    return { name: typeof nm === 'string' && nm.trim() ? nm.trim().slice(0, 60) : '', deck }
  })
}

/**
 * which deck to show when the open one (id) is gone from the list: the deck just before it in the old order that is
 * still there, else the first one. Keeps id when it still exists. list must not be empty.
 */
export function keepActive(oldList: { id: string }[], list: { id: string }[], id: string): string {
  if (list.some(d => d.id === id)) return id
  const i = oldList.findIndex(d => d.id === id)
  for (let j = i - 1; j >= 0; j--) if (list.some(d => d.id === oldList[j].id)) return oldList[j].id
  return list[0].id
}

/**
 * One change this tab makes to the deck list. Applied to the latest stored list (another tab may have changed it),
 * and replayed on every newer stored list until it is saved — so ops are idempotent and carry everything they need
 * (new ids, names, the fresh deck), nothing random is made while applying.
 *  - set: replace a deck's {f, L, c}; src = that deck as this tab showed it, put back if another tab deleted it meanwhile
 *  - add: append decks (new deck · decks from a file or link) that are not in the list yet
 *  - dup: copy of deck id right after it (from the stored version of that deck when it is there, else src)
 *  - rename · del: del of the last deck leaves fresh, a new empty deck
 */
export type DeckOp =
  | { t: 'set'; id: string; deck: Deck; at: number; src?: SavedDeck }
  | { t: 'add'; decks: SavedDeck[] }
  | { t: 'dup'; id: string; src: SavedDeck; copy: { id: string; name: string; updated: number } }
  | { t: 'rename'; id: string; name: string }
  | { t: 'del'; id: string; fresh: SavedDeck }

/** the deck a copy is made from: the stored one (latest edits from any tab), or the one this tab showed when it is gone */
export function dupSource(list: SavedDeck[], id: string, src: SavedDeck): { deck: SavedDeck; i: number } {
  const i = list.findIndex(x => x.id === id)
  return { deck: i < 0 ? src : list[i], i }
}

/** a deck list is never empty: an empty one becomes [fresh] */
export const ensureDeck = (list: SavedDeck[], fresh: SavedDeck): SavedDeck[] => (list.length ? list : [fresh])

export function applyDeckOp(list: SavedDeck[], op: DeckOp): SavedDeck[] {
  switch (op.t) {
    case 'set': {
      const upd = (x: SavedDeck): SavedDeck => ({ ...x, f: op.deck.f, L: op.deck.L, c: op.deck.c, updated: op.at })
      if (list.some(x => x.id === op.id)) return list.map(x => (x.id === op.id ? upd(x) : x))
      return op.src ? [...list, upd(op.src)] : list
    }
    case 'add': { const have = new Set(list.map(x => x.id)); const add = op.decks.filter(d => !have.has(d.id)); return add.length ? [...list, ...add] : list }
    case 'dup': {
      if (list.some(x => x.id === op.copy.id)) return list
      const { deck, i } = dupSource(list, op.id, op.src)
      const d: SavedDeck = { ...deck, c: { ...deck.c }, ...op.copy }
      return i < 0 ? [...list, d] : [...list.slice(0, i + 1), d, ...list.slice(i + 1)]
    }
    case 'rename': return list.map(x => (x.id === op.id ? { ...x, name: op.name } : x))
    case 'del': return ensureDeck(list.filter(x => x.id !== op.id), op.fresh)
  }
}
