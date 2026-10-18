import { describe, expect, it } from 'vitest'
import { CARDS } from '../../src/lib/data'
import { FAC_ORDER } from '../../src/lib/constants'
import { groupByFac, heroCard, splitSections } from '../../src/lib/home'

describe('cards home', () => {
  it('hero card = Gold unit with the highest provision of the faction', () => {
    for (const f of FAC_ORDER) {
      const h = heroCard(CARDS, f)!; expect(h.f).toBe(f); expect(h.c).toBe('Gold'); expect(h.t).toBe('Unit')
      expect(Math.max(...CARDS.filter(c => c.f === f && c.c === 'Gold' && c.t === 'Unit').map(c => c.v))).toBe(h.v)
    }
  })
  it('faction sections add up to the faction total', () => {
    for (const f of FAC_ORDER) {
      const all = CARDS.filter(c => c.f === f); const s = splitSections(all)
      expect(s.leader.length + s.gold.length + s.bronze.length + s.other.length).toBe(all.length)
    }
    const m = splitSections(CARDS.filter(c => c.f === 'Monster')); expect(m.leader.length).toBeGreaterThan(0); expect(m.gold.every(c => c.t === 'Unit' && c.c === 'Gold')).toBe(true)
  })
  it('groups by faction in order and skips empty factions', () => {
    const g = groupByFac(CARDS.filter(c => /geralt/i.test(c.n)), FAC_ORDER)
    expect(g.reduce((n, [, v]) => n + v.length, 0)).toBe(CARDS.filter(c => /geralt/i.test(c.n)).length)
    expect(g.every(([, v]) => v.length > 0)).toBe(true)
  })
})
