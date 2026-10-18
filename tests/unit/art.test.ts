import { describe, expect, it } from 'vitest'
import { artSources, GO, lqipUrl, NA_LOW, NA_MED, PG } from '../../src/lib/art'
import { CARDS, TOK } from '../../src/lib/data'

const c = { art: 1146, pi: '0001/26/x.jpg', t: 'Unit' }
const GL = 'https://gwent.one/img/assets/low/art/1146.jpg', GM = 'https://gwent.one/img/assets/medium/art/1146.jpg'

describe('card art urls', () => {
  it('card with a playgwent preview: playgwent first (both sizes), gwent.one as the fallback', () => {
    expect(artSources(c, 'low')).toEqual([{ url: PG + c.pi, pg: true }, { url: GL, pg: false }])
    expect(artSources(c, 'medium').map(x => x.url)).toEqual([PG + c.pi, GM])
  })
  it('gwent.one missing (flag from the pipeline): playgwent only, no 1 s wait for the 404', () => {
    expect(artSources({ ...c, na: NA_LOW | NA_MED }, 'low')).toEqual([{ url: PG + c.pi, pg: true }])
    expect(artSources({ ...c, na: NA_LOW | NA_MED }, 'medium')).toEqual([{ url: PG + c.pi, pg: true }])
  })
  it('leader ability preview is a framed card back: marked for cropping', () => {
    expect(artSources({ ...c, t: 'Ability' }, 'low')[0]).toEqual({ url: PG + c.pi, pg: true, frame: true })
  })
  it('no playgwent preview (token): gwent.one at the size it has, else nothing', () => {
    const t = { art: 1146 }
    expect(artSources(t, 'low').map(x => x.url)).toEqual([GL])
    expect(artSources({ ...t, na: NA_MED }, 'medium').map(x => x.url)).toEqual([GL])
    expect(artSources({ ...t, na: NA_LOW }, 'low').map(x => x.url)).toEqual([GM])
    expect(artSources({ ...t, na: NA_LOW | NA_MED }, 'low')).toEqual([])
  })
  it('real data: every card starts at playgwent · placeholders are data urls', () => {
    for (const x of CARDS) expect(artSources(x, 'low')[0].url.startsWith(PG)).toBe(true)
    for (const x of Object.values(TOK)) if (x.na === (NA_LOW | NA_MED)) expect(artSources(x, 'low')).toEqual([])
    expect(CARDS.every(x => x.lq)).toBe(true)
    expect(lqipUrl(CARDS[0])).toMatch(/^data:image\/webp;base64,/)
  })
})

describe('card art urls · build:web (local = self-hosted public/art/l/)', () => {
  const L = { ...c, id: 112405, lq: 'x' }
  const own = (x: { id?: number; art: number; tok?: number }) => `/art/l/${x.tok ? 'a' + x.art : 'c' + x.id}.webp`
  it('own file first (same 376 px file for every size), then gwent.one at the sizes it has · never playgwent', () => {
    expect(artSources(L, 'low', true)).toEqual([{ url: own(L), pg: true }, { url: GL, pg: false }])
    expect(artSources(L, 'medium', true).map(x => x.url)).toEqual([own(L), GM])
    expect(artSources({ ...L, na: NA_LOW | NA_MED }, 'low', true)).toEqual([{ url: own(L), pg: true }])
    expect(artSources({ ...L, t: 'Ability' }, 'low', true)[0]).toEqual({ url: own(L), pg: true, frame: true })
  })
  it('no local file (no lq): gwent.one only, at the size it has, else nothing', () => {
    const t = { art: 1146, tok: 1 }
    expect(artSources(t, 'low', true).map(x => x.url)).toEqual([GL])
    expect(artSources({ ...t, na: NA_LOW }, 'low', true).map(x => x.url)).toEqual([GM])
    expect(artSources({ ...t, na: NA_LOW | NA_MED }, 'medium', true)).toEqual([])
  })
  it('real data: cards start at their own file · tokens without a file fall back to gwent.one when it has the art', () => {
    for (const x of CARDS) expect(artSources(x, 'low', true)[0].url).toBe(own(x))
    for (const x of [...CARDS, ...Object.values(TOK)]) for (const u of artSources(x, 'medium', true).map(s => s.url)) expect(u.startsWith(PG)).toBe(false)
    for (const id of [203021, 203122, 203124, 203167]) {
      const x = TOK[id]; expect(x.lq).toBeFalsy()
      expect(artSources(x, 'low', true).map(s => s.url)).toEqual([GO + 'medium/art/' + x.art + '.jpg'])
    }
  })
})
