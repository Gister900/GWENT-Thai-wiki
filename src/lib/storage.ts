// localStorage access. Keys and value formats MUST stay identical to the old single-file page,
// so the new build opened at the same path keeps reading what was saved before. Every access is
// wrapped in try/catch (file:// + private mode can throw). Every write returns false when the browser refused it
// (quota full, storage blocked) so the app can warn instead of losing the change silently.
// Keys several tabs share (decks · collection · stars · recent · scraps) are changed only through update(): it reads
// the latest stored value right before the change, so a tab never writes back a stale copy over another tab's work.
// Reading: read*() = the stored value or null (missing where "missing" has no meaning, broken or unreadable) ·
// load*() = read*() ?? the empty value. A broken value is read the same way everywhere.
import type { Deck, Lang, Own } from '../types'
import { normalizeDeck } from './deckRules'
import { RECENT_MAX } from './recent'
import { cleanSaved, initDecks, type DeckInit, type SavedDeck } from './decks'

export const KEYS = {
  deck: 'gwent-deck',     // JSON {f: faction, L: leader id|null, c: {cardId: copies}}
  own: 'gwent-own',       // JSON {cardId: copies owned}
  scraps: 'gwent-scraps', // raw text of the scraps input
  lang: 'gwent-lang',     // "th" | "en"
  stars: 'gwent-stars',   // JSON [cardId, ...]
  recOwned: 'gwent-rec-owned', // "1" | "0" — deck recommendations: only cards in the collection (added 18 Oct 2026)
  side: 'gwent-side',     // "1" = sidebar collapsed to icons · "0" = open (added 18 Oct 2026, redesign)
  recent: 'gwent-recent', // JSON [cardId, ...] — cards last opened in the modal, newest first, max 20 (added 18 Oct 2026, cards home)
  decks: 'gwent-decks',   // JSON [{id, name, f, L, c, updated}, ...] — all saved decks (added 18 Oct 2026, several decks)
  deckActive: 'gwent-deck-active', // id of the deck that is open (added 18 Oct 2026)
  seenLog: 'gwent-seen-changelog', // version of the newest "What's new" entry the user has seen (added 18 Oct 2026)
} as const

/** raw value · null = not set · undefined = storage could not be read */
function raw(k: string): string | null | undefined { try { return localStorage.getItem(k) } catch { return undefined } }
const get = (k: string): string | null => raw(k) ?? null
/** false = the write failed (quota full, storage blocked) */
export function set(k: string, v: string): boolean { try { localStorage.setItem(k, v); return true } catch { return false } }
const json = (r: string | null | undefined): unknown => { if (r == null) return undefined; try { return JSON.parse(r) } catch { return undefined } }

/** how a shared key is read from (null = broken/unreadable, or missing where noted) and written to its stored string */
interface Codec<T> { parse(r: string | null | undefined): T | null; ser(v: T): string }

const ownCodec: Codec<Own> = {
  // missing = empty collection
  parse: r => { if (r === null) return {}; const v = json(r); return v && typeof v === 'object' && !Array.isArray(v) ? (v as Own) : null },
  ser: o => JSON.stringify(o),
}
const starsCodec: Codec<Set<number>> = {
  parse: r => { if (r === null) return new Set(); const v = json(r); return Array.isArray(v) ? new Set(v) : null },
  ser: s => JSON.stringify([...s]),
}
const recentCodec: Codec<number[]> = {
  parse: r => { if (r === null) return []; const v = json(r); return Array.isArray(v) ? v.filter(x => typeof x === 'number').slice(0, RECENT_MAX) : null },
  ser: ids => JSON.stringify(ids),
}
const scrapsCodec: Codec<string> = { parse: r => r ?? null, ser: v => v }
// the deck list is parsed (and every deck normalized) again only when the stored string changed
let decksMemo: { r: string; v: SavedDeck[] | null } | null = null
const decksCodec: Codec<SavedDeck[]> = {
  // missing, broken or empty = null: there is always at least one deck, so the caller keeps what it has
  parse: r => {
    if (!r) return null
    if (decksMemo?.r !== r) { const v = cleanSaved(json(r)); decksMemo = { r, v: v && v.length ? v : null } }
    return decksMemo.v
  },
  // what this tab writes is already clean: remember it, so the next change does not parse + normalize every deck again
  ser: d => { const r = JSON.stringify(d); decksMemo = { r, v: d.length ? d : null }; return r },
}
const CODECS = { [KEYS.own]: ownCodec, [KEYS.stars]: starsCodec, [KEYS.recent]: recentCodec, [KEYS.scraps]: scrapsCodec, [KEYS.decks]: decksCodec }
type Shared = typeof CODECS
export type SharedKey = keyof Shared
type Val<K extends SharedKey> = Shared[K] extends Codec<infer T> ? T : never

const read = <K extends SharedKey>(k: K): Val<K> | null => (CODECS[k] as Codec<Val<K>>).parse(raw(k))

/**
 * Change a key several tabs share: read the latest stored value (null = missing/broken/unreadable, see the codec),
 * fn makes the new value from it, write it. Returns that value and whether the write worked.
 */
export function update<K extends SharedKey>(k: K, fn: (latest: Val<K> | null) => Val<K>): { value: Val<K>; ok: boolean } {
  const value = fn(read(k))
  return { value, ok: set(k, (CODECS[k] as Codec<Val<K>>).ser(value)) }
}

export function loadDeck(): Deck { const v = json(get(KEYS.deck)); return normalizeDeck(v === undefined ? null : v) }

/** latest stored collection · null = broken or unreadable (caller keeps what it has) */
export const readOwn = (): Own | null => read(KEYS.own)
export const loadOwn = (): Own => readOwn() ?? {}
export const saveOwn = (o: Own) => set(KEYS.own, ownCodec.ser(o))

/** latest stored stars · null = broken or unreadable */
export const readStars = (): Set<number> | null => read(KEYS.stars)
export const loadStars = (): Set<number> => readStars() ?? new Set()
export const saveStars = (s: Set<number>) => set(KEYS.stars, starsCodec.ser(s))

export function loadLang(): Lang { const v = get(KEYS.lang); return v === 'th' || v === 'en' ? v : 'th' }
export const saveLang = (l: Lang) => set(KEYS.lang, l)

/** null when never saved (input stays empty) */
export const loadScraps = (): string | null => read(KEYS.scraps)

export const loadRecOwned = (): boolean => get(KEYS.recOwned) === '1'
export const saveRecOwned = (v: boolean) => set(KEYS.recOwned, v ? '1' : '0')

export const loadSide = (): boolean => get(KEYS.side) === '1'
export const saveSide = (v: boolean) => set(KEYS.side, v ? '1' : '0')

export const loadRecent = (): number[] => read(KEYS.recent) ?? []

/** several decks: read gwent-decks, or move the old gwent-deck in as the first deck (gwent-deck itself is never rewritten — it stays as a backup) */
export function loadDecks(lang: Lang): DeckInit {
  const r = initDecks(get(KEYS.decks), get(KEYS.deckActive), get(KEYS.deck), lang)
  if (r.created) { saveDecks(r.decks); saveActiveDeck(r.active) }
  return r
}
export const saveDecks = (d: SavedDeck[]) => set(KEYS.decks, decksCodec.ser(d))
/** latest stored deck list · null = missing, unreadable or empty (caller keeps what it has) */
export const readDecks = (): SavedDeck[] | null => read(KEYS.decks)
export const saveActiveDeck = (id: string) => set(KEYS.deckActive, id)

export const loadSeenLog = (): string | null => get(KEYS.seenLog)
export const saveSeenLog = (v: string) => set(KEYS.seenLog, v)
