import { describe, expect, it } from 'vitest'
import { craftPlan, parseScraps } from '../../src/lib/craft'
import type { Card } from '../../src/types'
import { CARDS } from '../../src/lib/data'

const mk = (id: number, n: string, cc: number, c: Card['c'] = 'Bronze'): Card => ({ id, art: 0, n, f: 'Monster', f2: '', t: 'Unit', p: 1, ar: 0, v: 4, c, r: 'Common', cat: '', ab: '', fl: '', abT: '', flT: '', s: '', au: '', rel: [], pi: '', cc })

describe('craft plan', () => {
  const a = mk(1, 'A', 30), b = mk(2, 'B', 80), g = mk(3, 'G', 800, 'Gold'), e = mk(4, 'E', 200, 'Gold')
  const B = { 1: a, 2: b, 3: g, 4: e } as Record<number, Card>
  const deck = { f: 'Monster', L: null, c: { 1: 2, 2: 1, 3: 1, 4: 1 } }
  it('lists missing copies cheapest first', () => {
    const p = craftPlan(deck, B, id => (id === 1 ? 1 : 0), null)
    expect(p.items.map(c => c.n)).toEqual(['A', 'B', 'E', 'G'])
    expect(p.total).toBe(30 + 80 + 200 + 800)
    expect(p.rows.every(r => !r.can)).toBe(true)
  })
  it('marks what fits in the scraps budget', () => {
    const p = craftPlan(deck, B, () => 0, 150)
    expect(p.last).toBe(2)
    expect(p.rows.map(r => r.can)).toEqual([true, true, true, false, false])
    expect(p.rows.map(r => r.cum)).toEqual([30, 60, 140, 340, 1140])
  })
  it('nothing craftable when first card is too expensive', () => { expect(craftPlan(deck, B, () => 0, 10).last).toBe(-1) })
  it('scraps input parsing', () => { expect(parseScraps('')).toBeNull(); expect(parseScraps('-5')).toBe(0); expect(parseScraps('1000')).toBe(1000) })
  it('real data: craft costs are the standard 30/80/200/800', () => {
    const costs = new Set(CARDS.filter(c => c.t !== 'Ability').map(c => c.cc))
    expect([...costs].sort((x, y) => x! - y!)).toEqual([30, 80, 200, 800])
  })
})
