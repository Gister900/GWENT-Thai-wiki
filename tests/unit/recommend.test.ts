import { describe, expect, it } from 'vitest'
import { ARCH, BYID, CARDS, PLBL } from '../../src/lib/data'
import { buildPairIndex, deckArchetype, pairScore, reasonLabel, recommend } from '../../src/lib/recommend'
import { blockWhy, deckTot, leaderAdds, DECK_MIN } from '../../src/lib/deckRules'
import type { Card, Deck } from '../../src/types'

const IX = buildPairIndex(CARDS)
const byName = (n: string) => CARDS.find(c => c.n === n)!
const CHRUM = byName('King Chrum')
const isOgroid = (c: Card) => /\bOgroid\b/.test(c.cat)
const rec = (d: Deck, o = {}) => recommend(d, BYID, CARDS, IX, o)
const monster = (c: Record<string, number>, L: number | null = null): Deck => ({ f: 'Monster', L, c })

describe('recommend', () => {
  it('no faction or empty deck → nothing', () => {
    expect(rec({ f: '', L: null, c: {} })).toEqual([])
    expect(rec(monster({}))).toEqual([])
  })
  it('King Chrum in deck → Ogroids come up, each says it fits King Chrum', () => {
    const r = rec(monster({ [CHRUM.id]: 1 }))
    expect(r.length).toBeGreaterThan(0); expect(r.length).toBeLessThanOrEqual(10)
    const og = r.filter(x => isOgroid(x.card))
    expect(og.length).toBeGreaterThanOrEqual(3)
    expect(og.every(x => x.via[0].id === CHRUM.id)).toBe(true)
    expect(reasonLabel(og[0].via[0].reason, PLBL)).toBe('Ogroid')
    expect(r.some(x => x.card.id === CHRUM.id)).toBe(false) // Gold, already 1 copy
  })
  it('score = Σ copies × symmetric pair score', () => {
    const d = monster({ [CHRUM.id]: 1 })
    for (const x of rec(d)) expect(x.score).toBe(pairScore(IX, CHRUM.id, x.card.id)[0])
    const br = rec(d).find(x => x.card.c === 'Bronze')!
    const d2 = monster({ [CHRUM.id]: 1, [br.card.id]: 2 })
    // a card paired with both King Chrum and the Bronze gets both contributions, the Bronze counted twice
    for (const x of rec(d2)) expect(x.score).toBe(pairScore(IX, CHRUM.id, x.card.id)[0] + 2 * pairScore(IX, br.card.id, x.card.id)[0])
  })
  it('both directions: a card listed only under the deck card, or only listing the deck card, still counts', () => {
    // Nekker lists King Chrum in its pairs, King Chrum (top 8) does not list Nekker
    const nek = byName('Nekker')
    expect(IX.get(CHRUM.id)!.has(nek.id)).toBe(false); expect(IX.get(nek.id)!.has(CHRUM.id)).toBe(true)
    expect(pairScore(IX, CHRUM.id, nek.id)[0]).toBeGreaterThan(0)
    const all = recommend(monster({ [CHRUM.id]: 1 }), BYID, CARDS, IX, { limit: 999 })
    expect(all.some(x => x.card.id === nek.id)).toBe(true)
  })
  it('cards with full copies never show up', () => {
    const all = recommend(monster({ [CHRUM.id]: 1 }), BYID, CARDS, IX, { limit: 999 })
    const br = all.find(x => x.card.c === 'Bronze')!.card, gd = all.find(x => x.card.c === 'Gold')!.card
    const r = recommend(monster({ [CHRUM.id]: 1, [br.id]: 2, [gd.id]: 1 }), BYID, CARDS, IX, { limit: 999 })
    expect(r.some(x => x.card.id === br.id || x.card.id === gd.id)).toBe(false)
    // one copy of a Bronze in deck → it can still be recommended (second copy)
    const r1 = recommend(monster({ [CHRUM.id]: 1, [br.id]: 1 }), BYID, CARDS, IX, { limit: 999 })
    expect(r1.some(x => x.card.id === br.id)).toBe(true)
  })
  it('wrong faction never shows up (only deck faction + Neutral), no leaders', () => {
    const all = recommend(monster({ [CHRUM.id]: 1 }), BYID, CARDS, IX, { limit: 999 })
    expect(all.every(x => x.card.f === 'Monster' || x.card.f === 'Neutral')).toBe(true)
    expect(all.some(x => x.card.t === 'Ability')).toBe(false)
    // Trollololo / Pugo / Bart are Ogroids of other factions
    expect(all.some(x => ['Trollololo', 'Pugo Boom-Breaker', 'Bart'].includes(x.card.n))).toBe(false)
  })
  it('over the provision cap → hidden once a leader is set', () => {
    const L = CARDS.find(c => c.t === 'Ability' && c.f === 'Monster')!
    const cap = 150 + leaderAdds(L)
    // fill with King Chrum + Monster Bronzes until only a few provisions are left
    const c: Record<string, number> = { [CHRUM.id]: 1 }
    for (const b of CARDS.filter(x => x.f === 'Monster' && x.c === 'Bronze' && x.t === 'Unit' && !isOgroid(x)).sort((a, z) => z.v - a.v)) {
      for (let k = 0; k < 2; k++) if (deckTot(monster(c, L.id), BYID).pv + b.v <= cap - 6) c[b.id] = (c[b.id] || 0) + 1
    }
    const d = monster(c, L.id), left = cap - deckTot(d, BYID).pv
    expect(left).toBeGreaterThanOrEqual(0); expect(left).toBeLessThan(11)
    const r = recommend(d, BYID, CARDS, IX, { limit: 999 })
    expect(r.every(x => x.card.v <= left && !blockWhy(x.card, d, BYID))).toBe(true)
    expect(r.some(x => x.card.n === 'Cave Troll')).toBe(false) // provision 11
    // same cards without a leader: no cap check yet → Cave Troll is back
    expect(recommend(monster(c), BYID, CARDS, IX, { limit: 999 }).some(x => x.card.n === 'Cave Troll')).toBe(true)
  })
  it('owned-only keeps cards the collection has more copies of than the deck uses', () => {
    const all = rec(monster({ [CHRUM.id]: 1 }))
    const keep = all[2].card.id
    const r = rec(monster({ [CHRUM.id]: 1 }), { ownedOnly: true, owned: (id: number) => (id === keep ? 1 : 0) })
    expect(r.map(x => x.card.id)).toEqual([keep])
  })
  it('deterministic order: score desc, Gold first, provision desc, id', () => {
    const d = monster({ [CHRUM.id]: 1, [byName('Nekker').id]: 1 })
    const a = recommend(d, BYID, CARDS, IX, { limit: 999 }), b = recommend(d, BYID, CARDS, IX, { limit: 999 })
    expect(a.map(x => x.card.id)).toEqual(b.map(x => x.card.id))
    for (let i = 1; i < a.length; i++) {
      const p = a[i - 1], q = a[i]
      const key = (x: typeof p) => [-x.score, x.card.c === 'Gold' ? 0 : 1, -x.card.v, x.card.id]
      const kp = key(p), kq = key(q)
      const cmp = kp.findIndex((v, j) => v !== kq[j])
      expect(cmp === -1 || kp[cmp] < kq[cmp]).toBe(true)
    }
  })
})

describe('recommend v2: leader · archetype · balance', () => {
  const SWARM = byName('Arachas Swarm')
  const isOrganic = (c: Card) => /\bOrganic\b/.test(c.cat)
  const recA = (d: Deck, o = {}) => recommend(d, BYID, CARDS, IX, { arch: ARCH, ...o })

  it('leader pairs come from pairs.py (lp), normal cards keep their pr', () => {
    expect(SWARM.t).toBe('Ability'); expect(SWARM.pr).toBeUndefined()
    expect(SWARM.lp!.some(([b]) => isOrganic(BYID[b]))).toBe(true)
  })
  it('Arachas Swarm + empty deck → Organic cards with a 👑 leader badge', () => {
    const r = recA(monster({}, SWARM.id))
    expect(r.length).toBeGreaterThan(0)
    const org = r.filter(x => isOrganic(x.card))
    expect(org.length).toBeGreaterThanOrEqual(3)
    for (const x of org) { expect(x.tags.some(t => t.k === 'leader')).toBe(true); expect(reasonLabel(x.leader!.reason, PLBL)).toBe('Organic') }
    // the same empty deck without a leader still recommends nothing
    expect(recA(monster({}))).toEqual([])
  })
  it('12 cards but only 3 units → units pushed to the top with ⚖️ เดคยังขาดยูนิต', () => {
    const c: Record<string, number> = { [CHRUM.id]: 1, [byName('Nekker').id]: 2 }
    const non = CARDS.filter(x => x.f === 'Monster' && x.c === 'Bronze' && x.t !== 'Unit' && x.t !== 'Ability').sort((a, z) => a.id - z.id)
    let n = 3
    for (const b of non) { if (n >= 12) break; const k = Math.min(2, 12 - n); c[b.id] = k; n += k }
    const d = monster(c), T = deckTot(d, BYID)
    expect(T.n).toBe(12); expect(T.u).toBe(3)
    const r = recA(d)
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].card.t).toBe('Unit')
    expect(r[0].tags.some(t => t.k === 'units')).toBe(true)
    // units rank above every non-unit that still made the list
    const firstNon = r.findIndex(x => x.card.t !== 'Unit')
    if (firstNon >= 0) expect(r.slice(firstNon).every(x => x.card.t !== 'Unit')).toBe(true)
  })
  it('provision almost spent → never recommends a card that leaves too few provisions for the rest', () => {
    const L = SWARM, cap = 150 + leaderAdds(L)
    const c: Record<string, number> = { [CHRUM.id]: 1 }
    for (const g of CARDS.filter(x => x.f === 'Monster' && x.c === 'Gold' && x.t === 'Unit' && x.id !== CHRUM.id).sort((a, z) => z.v - a.v || a.id - z.id)) {
      if (deckTot(monster(c, L.id), BYID).pv + g.v <= cap - 75) c[g.id] = 1
    }
    const d = monster(c, L.id), T = deckTot(d, BYID), left = cap - T.pv, slots = DECK_MIN - T.n
    const pool = CARDS.filter(x => x.t !== 'Ability' && (x.f === 'Monster' || x.f === 'Neutral'))
    const minV = Math.min(...pool.filter(x => x.t !== 'Stratagem').map(x => x.v))
    const fits = (x: Card) => left - x.v >= (slots - 1) * minV
    // there are expensive cards blockWhy would still allow …
    expect(pool.some(x => !blockWhy(x, d, BYID) && !fits(x))).toBe(true)
    // … but none of them is recommended
    const r = recA(d, { limit: 999 })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every(x => fits(x.card))).toBe(true)
  })
  it('2 key cards of an archetype → its other key cards come up with 🧩', () => {
    const wf = ARCH!.Monster.find(a => a.name === 'White Frost')!
    const ks = wf.key_cards!.map(Number).filter(id => BYID[id])
    const d = monster({ [ks[0]]: 1, [ks[1]]: 1 })
    expect(deckArchetype(d, BYID, ARCH)?.name).toBe('White Frost')
    const r = recA(d)
    const hits = r.filter(x => ks.slice(2).includes(x.card.id))
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every(x => x.tags.some(t => t.k === 'arch') && x.arch?.name === 'White Frost')).toBe(true)
    // 1 Bronze key card alone is not enough to call the style
    const br = ks.find(id => BYID[id].c === 'Bronze')
    if (br) expect(deckArchetype(monster({ [br]: 1 }), BYID, ARCH)).toBeNull()
  })
  it('King Chrum still pushes Ogroids with archetypes and a leader on', () => {
    const r = recA(monster({ [CHRUM.id]: 1 }, SWARM.id))
    const og = r.filter(x => isOgroid(x.card))
    expect(og.length).toBeGreaterThanOrEqual(3)
    expect(og.every(x => x.via[0]?.id === CHRUM.id && x.tags.some(t => t.k === 'pair'))).toBe(true)
  })
})
