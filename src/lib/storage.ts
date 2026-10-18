// localStorage access. Keys and value formats MUST stay identical to the old single-file page,
// so the new build opened at the same path keeps reading what was saved before. Every access is
// wrapped in try/catch (file:// + private mode can throw).
import type { Deck, Lang, Own } from '../types'
import { normalizeDeck } from './deckRules'
import { RECENT_MAX } from './recent'

export const KEYS = {
  deck: 'gwent-deck',     // JSON {f: faction, L: leader id|null, c: {cardId: copies}}
  own: 'gwent-own',       // JSON {cardId: copies owned}
  scraps: 'gwent-scraps', // raw text of the scraps input
  lang: 'gwent-lang',     // "th" | "en"
  stars: 'gwent-stars',   // JSON [cardId, ...]
  recOwned: 'gwent-rec-owned', // "1" | "0" — deck recommendations: only cards in the collection (added 18 Oct 2026)
  side: 'gwent-side',     // "1" = sidebar collapsed to icons · "0" = open (added 18 Oct 2026, redesign)
  recent: 'gwent-recent', // JSON [cardId, ...] — cards last opened in the modal, newest first, max 20 (added 18 Oct 2026, cards home)
} as const

function get(k: string): string | null { try { return localStorage.getItem(k) } catch { return null } }
function set(k: string, v: string) { try { localStorage.setItem(k, v) } catch { /* ignore */ } }

export function loadDeck(): Deck { try { return normalizeDeck(JSON.parse(localStorage.getItem(KEYS.deck) || 'null')) } catch { return normalizeDeck(null) } }
export const saveDeck = (d: Deck) => set(KEYS.deck, JSON.stringify(d))

export function loadOwn(): Own { try { const v = JSON.parse(localStorage.getItem(KEYS.own) || '{}'); if (v && typeof v === 'object') return v } catch { /* ignore */ } return {} }
export const saveOwn = (o: Own) => set(KEYS.own, JSON.stringify(o))

export function loadStars(): Set<number> { try { return new Set(JSON.parse(localStorage.getItem(KEYS.stars) || '[]')) } catch { return new Set() } }
export const saveStars = (s: Set<number>) => set(KEYS.stars, JSON.stringify([...s]))

export function loadLang(): Lang { const v = get(KEYS.lang); return v === 'th' || v === 'en' ? v : 'th' }
export const saveLang = (l: Lang) => set(KEYS.lang, l)

/** null when never saved (input stays empty) */
export const loadScraps = (): string | null => get(KEYS.scraps)
export const saveScraps = (v: string) => set(KEYS.scraps, v)

export const loadRecOwned = (): boolean => get(KEYS.recOwned) === '1'
export const saveRecOwned = (v: boolean) => set(KEYS.recOwned, v ? '1' : '0')

export const loadSide = (): boolean => get(KEYS.side) === '1'
export const saveSide = (v: boolean) => set(KEYS.side, v ? '1' : '0')

export function loadRecent(): number[] { try { const v = JSON.parse(localStorage.getItem(KEYS.recent) || '[]'); if (Array.isArray(v)) return v.filter(x => typeof x === 'number').slice(0, RECENT_MAX) } catch { /* ignore */ } return [] }
export const saveRecent = (ids: number[]) => set(KEYS.recent, JSON.stringify(ids))
