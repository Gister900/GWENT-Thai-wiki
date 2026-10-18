// Share a deck as a link: #deck=<code>. No server, so the whole deck lives in the code; it is kept as short as possible:
//   bytes = [version 1][faction index in DECK_FACS][leader id as varint, 0 = none]
//           then per card, ids sorted ascending: varint( (id − previous id) × 2 + (copies − 1) )
//   code  = base64url of those bytes (no padding)
// A 25-card deck is ~40 bytes → ~55 characters. Card ids (not list positions) are used so old links keep working
// when new cards are added to the data. Decoding checks the deck with validateDeck (throws DeckError on anything bad).
import type { Card, Deck } from '../types'
import { DECK_FACS, DeckError, validateDeck } from './decks'

const VER = 1
export const HASH_KEY = 'deck='

function b64url(bytes: number[]): string {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function unb64url(code: string): number[] {
  if (!/^[A-Za-z0-9_-]+$/.test(code)) throw new DeckError('shape')
  let s: string
  try { s = atob(code.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((code.length + 3) % 4)) } catch { throw new DeckError('shape') }
  return [...s].map(ch => ch.charCodeAt(0))
}
function putVar(out: number[], n: number) { while (n >= 0x80) { out.push((n & 0x7f) | 0x80); n = Math.floor(n / 128) } out.push(n) }

export function encodeDeck(d: Deck): string {
  const fi = DECK_FACS.indexOf(d.f); if (fi < 0) throw new DeckError('faction', d.f)
  const out = [VER, fi]; putVar(out, d.L || 0)
  let prev = 0
  for (const id of Object.keys(d.c).map(Number).filter(i => d.c[i] > 0).sort((a, b) => a - b)) {
    putVar(out, (id - prev) * 2 + (Math.min(2, d.c[id]) - 1)); prev = id
  }
  return b64url(out)
}

export function decodeDeck(code: string, byId: Record<number, Card>): Deck {
  const b = unb64url(code.trim()); let i = 0
  const getVar = () => {
    let n = 0, mul = 1
    for (let k = 0; k < 5; k++) { if (i >= b.length) throw new DeckError('shape'); const x = b[i++]; n += (x & 0x7f) * mul; if (!(x & 0x80)) return n; mul *= 128 }
    throw new DeckError('shape')
  }
  if (b.length < 3 || b[i++] !== VER) throw new DeckError('shape')
  const f = DECK_FACS[b[i++]]; if (!f) throw new DeckError('faction')
  const L = getVar() || null
  const c: Record<string, unknown> = {}; let prev = 0
  while (i < b.length) {
    const v = getVar(), id = prev + Math.floor(v / 2)
    if (id === prev && prev !== 0) throw new DeckError('shape')
    c[id] = (v % 2) + 1; prev = id
  }
  return validateDeck({ f, L, c }, byId)
}

/** link to this page with the deck in the hash (works for https://…/base/ and for file://…/GWENT-Thai-wiki.html) */
export const deckLink = (href: string, d: Deck) => href.split('#')[0] + '#' + HASH_KEY + encodeDeck(d)

/** the code part of a location hash, or null when the hash is not a deck link */
export function codeFromHash(hash: string): string | null {
  const h = hash.replace(/^#/, '')
  if (!h.startsWith(HASH_KEY)) return null
  try { return decodeURIComponent(h.slice(HASH_KEY.length)) } catch { return '' }
}
