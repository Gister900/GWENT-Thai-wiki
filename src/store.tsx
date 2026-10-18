// App-wide state shared by the features. Two contexts:
//  - Actions: stable callbacks (never change identity → memoized card items don't re-render)
//  - AppState: values that change (deck, collection, stars, language, ...)
import { createContext, useContext } from 'react'
import type { Deck, Lang, Own } from './types'

/** pages in the sidebar: cards · deck · collection · starred · factions & deck styles */
export type Tab = 'cards' | 'deck' | 'coll' | 'stars' | 'ov'
/** the three pages that share the card grid */
export type GridPage = 'cards' | 'coll' | 'stars'
/** sub-pages of the "การ์ด" menu: home (search + faction tiles + rows) · one faction (to = jump to its deck styles) · all cards with the filter panel */
export type CardsView = { v: 'home' } | { v: 'fac'; f: string; to?: 'arch' } | { v: 'all' }
/** "ดูทั้งหมด →" from a home row opens the all-cards grid with this filter set (null = keep the filters as they were) */
export type AllPreset = 'tip' | 'recent' | null

export interface Actions {
  toggleStar(id: number): void
  addToDeck(id: number): boolean
  removeFromDeck(id: number): void
  setDeck(d: Deck): void
  cycleOwn(id: number): void
  /** replace the whole collection (bulk set / import) */
  setOwnAll(o: Own): void
  /** open the big-card modal; list = the prev/next order (null = keep current list or use the grid list) */
  openModal(id: number, list: number[] | null): void
  /** open a card from a link inside the modal (pairs, related): remembers the current card + scroll so it can go back */
  pushModal(id: number): void
  /** go back in the modal history; lv = index in hist to return to (default = the previous card) */
  backModal(lv?: number): void
  closeModal(): void
  stepModal(d: number): void
  /** sidebar page · "cards" always opens the cards home */
  showTab(t: Tab): void
  /** go to a sub-page of "การ์ด" (stays highlighted in the sidebar) */
  showCards(v: CardsView, preset?: AllPreset): void
  setLang(l: Lang): void
  /** raw text of the scraps input (gwent-scraps) — shown in the sidebar and the craft plan */
  setScraps(v: string): void
  /** the all-cards grid publishes its current (filtered, sorted) id list here */
  setCurList(ids: number[]): void
  getCurList(): number[]
}

/** one remembered card in the modal history (opened from inside the modal) */
export interface ModalHist { id: number; list: number[]; scroll: number }
/** big-card modal state: list/idx = prev/next order · hist = cards to go back to (cleared on close) · scroll = where to put the scroll on open */
export interface ModalState { id: number; idx: number; list: number[]; n: number; hist: ModalHist[]; scroll: number }

export interface AppState {
  lang: Lang
  tab: Tab
  /** which sub-page of "การ์ด" is showing */
  view: CardsView
  /** all-cards grid filter request from the home rows (n changes on every request) */
  allReq: { n: number; preset: AllPreset }
  /** cards last opened in the modal, newest first (gwent-recent) */
  recent: number[]
  deck: Deck
  own: Own
  stars: Set<number>
  scraps: string
  /** card just added to the deck (highlighted for 2.6 s) */
  newRow: { id: number; t: number } | null
}

export const ActionsCtx = createContext<Actions>(null as unknown as Actions)
export const StateCtx = createContext<AppState>(null as unknown as AppState)
export const useActions = () => useContext(ActionsCtx)
export const useAppState = () => useContext(StateCtx)
