import { describe, expect, it } from 'vitest'
import { CARDS, BYID, SKEY, FO, PROVS, hasTip } from '../../src/lib/data'
import { matchCard, normQuery, pickCards, sorter, type CardFilter } from '../../src/lib/search'
import { makeKwRe, cardKws, kwWrap } from '../../src/lib/keywords'
import { KW } from '../../src/lib/data'
import { ownN, ownOk, parseImport } from '../../src/lib/collection'

const base = (): CardFilter => ({ fac: new Set(), type: new Set(), col: new Set(), q: '', pmin: PROVS[0], pmax: PROVS[PROVS.length - 1], star: false, tip: false })
const run = (st: CardFilter) => CARDS.filter(c => matchCard(c, st, SKEY.get(c.id)!, false, hasTip(c.id)))

describe('data', () => {
  it('pipeline counts', () => { expect(CARDS.length).toBe(1260) })
})

describe('search', () => {
  it('no filter = all cards', () => { expect(run(base()).length).toBe(1260) })
  it('English name search', () => {
    const r = run({ ...base(), q: normQuery('  GERALT ') })
    expect(r.length).toBeGreaterThan(0); expect(r.some(c => c.n.includes('Geralt'))).toBe(true)
  })
  it('Thai text search hits Thai ability text', () => {
    const c = CARDS.find(x => x.abT && x.abT.length > 10)!
    const word = c.abT.split(/\s+/).find(w => w.length >= 4)!
    expect(run({ ...base(), q: normQuery(word) }).map(x => x.id)).toContain(c.id)
  })
  it('faction filter includes secondary faction', () => {
    const r = run({ ...base(), fac: new Set(['Syndicate']) })
    expect(r.every(c => c.f === 'Syndicate' || c.f2 === 'Syndicate')).toBe(true)
  })
  it('tip flag keeps only cards with their own tip (74)', () => {
    const r = run({ ...base(), tip: true })
    expect(r.length).toBe(74); expect(r.every(c => hasTip(c.id))).toBe(true)
  })
  it('tip flag combines with other filters', () => {
    const fac = run({ ...base(), fac: new Set(['Monster']) }).filter(c => hasTip(c.id)).length
    expect(run({ ...base(), tip: true, fac: new Set(['Monster']) }).length).toBe(fac)
  })
  it('sort by faction order then provision desc', () => {
    const r = [...CARDS].sort(sorter('fac', c => FO.get(c.id)!))
    expect(r[0].f).toBe('Monster'); expect(r[r.length - 1].f).toBe('Neutral')
  })
  it('picker: faction + Neutral, no leaders, own faction first', () => {
    const r = pickCards(CARDS, 'Monster', { q: '', col: '', type: '', prov: '', own: '' }, c => SKEY.get(c.id)!, () => 0)
    expect(r.every(c => c.t !== 'Ability' && (c.f === 'Monster' || c.f === 'Neutral'))).toBe(true)
    expect(r[0].f).toBe('Monster'); expect(r[r.length - 1].f).toBe('Neutral')
    const p = pickCards(CARDS, 'Monster', { q: '', col: 'Gold', type: '', prov: '8-9', own: '' }, c => SKEY.get(c.id)!, () => 0)
    expect(p.every(c => c.c === 'Gold' && c.v >= 8 && c.v <= 9)).toBe(true)
  })
})

describe('keywords', () => {
  const re = makeKwRe(Object.keys(KW))
  it('wraps keywords only outside tags, plurals ok', () => {
    const h = kwWrap('<span class="k">Deploy</span>: gain 2 Coins', re)
    expect(h).toContain('<span class="k"><button type="button" class="kwb" data-kw="Deploy">Deploy</button></span>')
    expect(h).toContain('data-kw="Coin">Coins</button>')
  })
  it('cardKws finds keywords in ability', () => { expect(cardKws({ ab: 'Deploy: Lock an enemy.' } as never, re)).toEqual(['Deploy', 'Lock']) })
})

describe('collection', () => {
  const br = CARDS.find(c => c.c === 'Bronze' && c.t === 'Unit')!
  const ld = CARDS.find(c => c.t === 'Ability')!
  it('ownN clamps to max copies', () => { expect(ownN({ [br.id]: 5 }, br.id, BYID)).toBe(2) })
  it('filters', () => { expect(ownOk('miss', br, 1)).toBe(true); expect(ownOk('full', br, 2)).toBe(true); expect(ownOk('none', ld, 0)).toBe(false) })
  it('import cleans data', () => {
    expect(parseImport(JSON.stringify({ own: { [br.id]: 9, [ld.id]: 1, 1: 1, x: 2 } }), BYID)).toEqual({ [br.id]: 2 })
    expect(() => parseImport('{"a":1}', BYID)).toThrow()
  })
})
