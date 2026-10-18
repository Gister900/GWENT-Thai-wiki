import { describe, expect, it } from 'vitest'
import { UI } from '../../src/i18n/ui'
import { addToDeck, blockWhy, deckChecks, deckTot } from '../../src/lib/deckRules'
import { ownSummaryText } from '../../src/lib/collection'
import { BYID, CARDS } from '../../src/lib/data'

/** every key path in a dictionary, with the kind of value (string / function / array length) */
function shape(o: unknown, p = ''): string[] {
  if (typeof o === 'function') return [p + ':fn']
  if (Array.isArray(o)) return [p + ':arr' + o.length, ...o.flatMap((v, i) => shape(v, p + '.' + i))]
  if (o && typeof o === 'object') return Object.keys(o).sort().flatMap(k => shape((o as Record<string, unknown>)[k], p + '.' + k))
  return [p + ':' + typeof o]
}
const THAI = /[฀-๿]/

describe('UI dictionary', () => {
  it('th and en have exactly the same keys (and the same kind of value)', () => {
    expect(shape(UI.en)).toEqual(shape(UI.th))
  })
  it('en has no Thai characters', () => {
    const strs: string[] = []
    const walk = (o: unknown) => { if (typeof o === 'string') strs.push(o); else if (typeof o === 'function') strs.push(String((o as (...a: unknown[]) => unknown)('x', 1, 2, 3))); else if (o && typeof o === 'object') Object.values(o).forEach(walk) }
    walk(UI.en)
    expect(strs.filter(s => THAI.test(s))).toEqual([])
  })
})

describe('lib messages follow the language', () => {
  const mo = CARDS.find(c => c.f === 'Monster' && c.c === 'Bronze' && c.t === 'Unit')!
  const nf = CARDS.find(c => c.f === 'Nilfgaard' && c.t === 'Unit')!
  const d = { f: 'Monster', L: null, c: {} }
  it('deck rules in English', () => {
    expect(blockWhy(nf, d, BYID, 'en')!.s).toBe('Other faction')
    expect(addToDeck(d, mo.id, BYID, 'en')!.msg).toBe(`✓ Added ${mo.n} · 1/25 cards`)
    expect(deckChecks(d, deckTot(d, BYID), 'en').map(x => x[1]).join(' ')).not.toMatch(THAI)
    expect(ownSummaryText(CARDS, {}, BYID, 'en')).not.toMatch(THAI)
  })
  it('Thai stays the default', () => {
    expect(blockWhy(nf, d, BYID)!.s).toBe('คนละฝ่าย')
  })
})
