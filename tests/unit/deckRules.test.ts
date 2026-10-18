import { describe, expect, it } from 'vitest'
import { addToDeck, blockWhy, deckChecks, deckTot, emptyDeck, leaderAdds, maxCopies, normalizeDeck, removeFromDeck } from '../../src/lib/deckRules'
import type { Card, Deck } from '../../src/types'

let nid = 1
const mk = (o: Partial<Card>): Card => ({ id: nid++, art: 0, n: 'C' + nid, f: 'Monster', f2: '', t: 'Unit', p: 3, ar: 0, v: 5, c: 'Bronze', r: 'Common', cat: '', ab: '', fl: '', abT: '', flT: '', s: '', au: '', rel: [], pi: '', ...o })
const idx = (cs: Card[]) => Object.fromEntries(cs.map(c => [c.id, c])) as Record<number, Card>

describe('deck rules', () => {
  const br = mk({ c: 'Bronze', v: 5 }), gd = mk({ c: 'Gold', v: 10, r: 'Legendary' }), nl = mk({ f: 'Neutral', v: 4 })
  const nf = mk({ f: 'Nilfgaard' }), sp = mk({ t: 'Special', v: 6 })
  const lead = mk({ t: 'Ability', c: 'Leader', v: 15, ab: 'Order: something. This ability adds 16 provision.' })
  const leadNoTxt = mk({ t: 'Ability', c: 'Leader', v: 14, ab: '' })
  const big = mk({ c: 'Gold', v: 165 })
  const B = idx([br, gd, nl, nf, sp, lead, leadNoTxt, big])

  it('copies: Bronze 2, Gold 1', () => { expect(maxCopies(br)).toBe(2); expect(maxCopies(gd)).toBe(1) })
  it('leader provision from text, else its value', () => { expect(leaderAdds(lead)).toBe(16); expect(leaderAdds(leadNoTxt)).toBe(14) })
  it('cap = 150 + leader', () => {
    expect(deckTot({ f: 'Monster', L: null, c: {} }, B).cap).toBe(150)
    expect(deckTot({ f: 'Monster', L: lead.id, c: {} }, B).cap).toBe(166)
  })
  it('totals count copies, units and provision', () => {
    const t = deckTot({ f: 'Monster', L: null, c: { [br.id]: 2, [sp.id]: 1, 999999: 3 } }, B)
    expect(t).toMatchObject({ n: 3, u: 2, pv: 16 })
  })
  it('needs a faction first', () => {
    const r = addToDeck(emptyDeck(), br.id, B)!
    expect(r.ok).toBe(false); expect(r.msg).toContain('ยังไม่ได้เลือกฝ่าย')
  })
  it('allows own faction + Neutral, blocks others', () => {
    const d: Deck = { f: 'Monster', L: null, c: {} }
    expect(blockWhy(br, d, B)).toBeNull(); expect(blockWhy(nl, d, B)).toBeNull()
    expect(blockWhy(nf, d, B)!.s).toBe('คนละฝ่าย')
  })
  it('third Bronze / second Gold is blocked', () => {
    let d: Deck = { f: 'Monster', L: null, c: {} }
    d = addToDeck(d, br.id, B)!.deck; d = addToDeck(d, br.id, B)!.deck
    expect(d.c[br.id]).toBe(2)
    const r = addToDeck(d, br.id, B)!; expect(r.ok).toBe(false); expect(r.msg).toContain('ใส่ได้ใบละ 2 ใบ')
    d = addToDeck(d, gd.id, B)!.deck; expect(addToDeck(d, gd.id, B)!.ok).toBe(false)
  })
  it('provision cap only enforced once a leader is set', () => {
    const d: Deck = { f: 'Monster', L: null, c: { [br.id]: 1 } }
    expect(blockWhy(big, d, B)).toBeNull()
    expect(blockWhy(big, { ...d, L: lead.id }, B)!.s).toBe('provision เกิน (เหลือ 161)')
  })
  it('leader ability sets leader (same faction only)', () => {
    const d: Deck = { f: 'Monster', L: null, c: {} }
    expect(addToDeck(d, lead.id, B)!.deck.L).toBe(lead.id)
    expect(addToDeck({ ...d, f: 'Skellige' }, lead.id, B)!.ok).toBe(false)
  })
  it('add message shows count / 25', () => {
    expect(addToDeck({ f: 'Monster', L: null, c: {} }, br.id, B)!.msg).toBe(`✓ เพิ่ม ${br.n} แล้ว · 1/25 ใบ`)
  })
  it('remove drops key at zero', () => {
    const d = removeFromDeck({ f: 'Monster', L: null, c: { [br.id]: 1 } }, br.id)
    expect(d.c).toEqual({})
  })
  it('checklist: 25 cards / 13 units / cap', () => {
    const c: Record<string, number> = {}
    const units = Array.from({ length: 13 }, () => mk({ v: 4 })); const sps = Array.from({ length: 12 }, () => mk({ t: 'Special', v: 4 }))
    const BB = { ...B, ...idx([...units, ...sps]) }; [...units, ...sps].forEach(x => { c[x.id] = 1 })
    const d: Deck = { f: 'Monster', L: lead.id, c }
    expect(deckChecks(d, deckTot(d, BB)).every(x => x[0])).toBe(true)
    delete c[units[0].id]
    const ch = deckChecks(d, deckTot(d, BB)); expect(ch[2][0]).toBe(false); expect(ch[3][0]).toBe(false)
  })
  it('normalizes stored deck like the old page', () => {
    expect(normalizeDeck(null)).toEqual({ f: '', L: null, c: {} })
    expect(normalizeDeck({ f: 'Skellige' })).toEqual({ f: 'Skellige', L: null, c: {} })
  })
})
