export type Lang = 'th' | 'en'
export type CardType = 'Unit' | 'Special' | 'Artifact' | 'Stratagem' | 'Ability'
export type Color = 'Bronze' | 'Gold' | 'Leader'

/** one reason a pair works: [kind, detail, ability line index in A, line index in B] */
export type PairReason = [string, string, number, number]
/** [paired card id, reasons, score] — score = sum of reason weights (pipeline/pairs.py) */
export type PairEntry = [number, PairReason[], number]

/** collectible card (from src/data/cards.json) */
export interface Card {
  id: number; art: number; n: string; f: string; f2: string; t: CardType
  p: number; ar: number; v: number; c: Color; r: string; cat: string
  ab: string; fl: string; abT: string; flT: string; s: string; au: string
  rel: number[]; pi: string; pr?: PairEntry[]; cc?: number
  /** art flags from pipeline/check_art.py: na = bits gwent.one has no art (1 low · 2 medium) · lq = LQIP base64 webp */
  na?: number; lq?: string
  /** leader abilities only: leader → card pairs (pipeline/pairs.py leader_pairs) · used by recommend, not shown in the modal */
  lp?: PairEntry[]
  tok?: undefined
}

/** non-collectible token (from src/data/tokens.json) — minimal data */
export interface Token {
  id: number; art: number; n: string; f: string; t: string; p: number; c: string
  cat: string; ab: string; fl: string; tok: 1; abT?: string; flT?: string; na?: number; lq?: string
  f2?: undefined; ar?: undefined; v?: undefined; r?: undefined; s?: undefined; au?: undefined
  rel?: undefined; pi?: undefined; pr?: undefined; cc?: undefined; lp?: undefined
}

export type AnyCard = Card | Token

export interface Keyword { en: string; th: string; tips: string[] }
export interface Archetype {
  name: string; name_th?: string; summary_th?: string; keywords?: string[]
  key_cards?: (number | string)[]; tips?: string[]; sources?: string[]
}
export type Archetypes = Record<string, Archetype[]> | null
export type CardTips = Record<string, { tips?: string[]; sources?: string[] }> | null

/** localStorage "gwent-deck" — shape must stay {f, L, c} */
export interface Deck { f: string; L: number | null; c: Record<string, number> }
/** localStorage "gwent-own" — card id → copies owned */
export type Own = Record<string, number>
