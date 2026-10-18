// storage.ts against a fake localStorage: failed writes are reported, read* returns the latest value or null.
import { afterEach, describe, expect, it } from 'vitest'
import * as storage from '../../src/lib/storage'
import { applyOwnOp, applyStarOp } from '../../src/lib/collection'
import { Pending } from '../../src/lib/pending'
import { mergeRecent } from '../../src/lib/recent'

function fake(opts: { full?: boolean; blocked?: boolean } = {}) {
  const m = new Map<string, string>()
  const ls = {
    getItem(k: string) { if (opts.blocked) throw new Error('SecurityError'); return m.has(k) ? m.get(k)! : null },
    setItem(k: string, v: string) { if (opts.full || opts.blocked) throw new Error('QuotaExceededError'); m.set(k, v) },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true })
  return m
}
afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage })

describe('storage writes', () => {
  it('report success and failure (quota full / blocked)', () => {
    fake(); expect(storage.saveOwn({ 1: 1 })).toBe(true); expect(storage.saveStars(new Set([1]))).toBe(true)
    fake({ full: true })
    expect(storage.saveOwn({ 1: 1 })).toBe(false); expect(storage.saveStars(new Set([1]))).toBe(false)
    expect(storage.saveDecks([])).toBe(false); expect(storage.saveActiveDeck('a')).toBe(false)
    fake({ blocked: true }); expect(storage.set('gwent-own', '{}')).toBe(false)
  })
})

describe('read latest before a change', () => {
  it('missing → empty · broken or unreadable → null (caller keeps its own copy)', () => {
    const m = fake()
    expect(storage.readOwn()).toEqual({}); expect(storage.readStars()).toEqual(new Set()); expect(storage.readDecks()).toBeNull()
    m.set('gwent-own', '{"5":2}'); m.set('gwent-stars', '[5,6]'); m.set('gwent-decks', '[{"id":"a","name":"x","f":"","L":null,"c":{}}]')
    expect(storage.readOwn()).toEqual({ 5: 2 }); expect(storage.readStars()).toEqual(new Set([5, 6])); expect(storage.readDecks()!.map(d => d.id)).toEqual(['a'])
    m.set('gwent-own', '{oops'); m.set('gwent-stars', '{}'); m.set('gwent-decks', '[]')
    expect(storage.readOwn()).toBeNull(); expect(storage.readStars()).toBeNull(); expect(storage.readDecks()).toBeNull()
    fake({ blocked: true }); expect(storage.readOwn()).toBeNull(); expect(storage.readStars()).toBeNull(); expect(storage.readDecks()).toBeNull()
  })
  it('load* = read* ?? empty: broken values read the same everywhere', () => {
    const m = fake()
    m.set('gwent-own', '[1,2]'); m.set('gwent-stars', '{}'); m.set('gwent-recent', '{oops'); m.set('gwent-deck', '{oops')
    expect(storage.readOwn()).toBeNull(); expect(storage.loadOwn()).toEqual({})
    expect(storage.readStars()).toBeNull(); expect(storage.loadStars()).toEqual(new Set())
    expect(storage.loadRecent()).toEqual([]); expect(storage.loadDeck()).toEqual({ f: '', L: null, c: {} })
    fake({ blocked: true }); expect(storage.loadOwn()).toEqual({}); expect(storage.loadScraps()).toBeNull(); expect(storage.loadLang()).toBe('th')
  })
})

describe('update(key, fn)', () => {
  it('reads the latest stored value, writes what fn returns, reports success', () => {
    const m = fake(); m.set('gwent-own', '{"5":2}')
    const r = storage.update('gwent-own', latest => ({ ...latest, 6: 1 }))
    expect(r).toEqual({ value: { 5: 2, 6: 1 }, ok: true }); expect(JSON.parse(m.get('gwent-own')!)).toEqual({ 5: 2, 6: 1 })
    expect(storage.update('gwent-stars', s => new Set([...(s ?? []), 9])).value).toEqual(new Set([9])) // missing = empty
    expect(m.get('gwent-stars')).toBe('[9]')
    expect(storage.update('gwent-scraps', () => '640')).toEqual({ value: '640', ok: true }); expect(m.get('gwent-scraps')).toBe('640')
  })
  it('latest = null when the value is broken or storage unreadable; write failure → ok false, value still returned', () => {
    const m = fake(); m.set('gwent-decks', '[]'); m.set('gwent-own', '{oops')
    let seen: unknown = 'x'; storage.update('gwent-decks', l => { seen = l; return [] }); expect(seen).toBeNull()
    storage.update('gwent-own', l => { seen = l; return {} }); expect(seen).toBeNull()
    fake({ full: true }); expect(storage.update('gwent-own', () => ({ 1: 1 }))).toEqual({ value: { 1: 1 }, ok: false })
    fake({ blocked: true }); storage.update('gwent-recent', l => { seen = l; return [] }); expect(seen).toBeNull()
  })
  it('recent: newest first, no repeats, at most 20, merged with the latest stored list', () => {
    const m = fake(); m.set('gwent-recent', '[7,8]')
    expect(storage.update('gwent-recent', l => mergeRecent(l, [8, 3], 5)).value).toEqual([5, 7, 8, 3])
    expect(mergeRecent(null, [1, 2], 2)).toEqual([2, 1])
    expect(mergeRecent(Array.from({ length: 30 }, (_, i) => i + 100), [], 1)).toHaveLength(20)
  })
})

describe('pending changes', () => {
  it('a failed save stays on screen and is saved with the next change; a stored value from another tab shows under it', () => {
    const m = fake({}), full = { on: true }
    const ls = { getItem: (k: string) => (m.has(k) ? m.get(k)! : null), setItem: (k: string, v: string) => { if (full.on) throw new Error('quota'); m.set(k, v) } }
    Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true })
    const p = new Pending<Record<string, number>, Parameters<typeof applyOwnOp>[1]>({}, applyOwnOp)
    const w = (fn: (l: Record<string, number> | null) => Record<string, number>) => storage.update('gwent-own', fn)
    expect(p.change({ t: 'set', ch: { 1: 1 } }, w)).toEqual({ value: { 1: 1 }, ok: false })
    expect(p.change({ t: 'set', ch: { 2: 2 } }, w).value).toEqual({ 1: 1, 2: 2 }) // card 1 still there
    m.set('gwent-own', '{"9":1}') // another tab
    expect(p.stored(storage.readOwn())).toEqual({ 9: 1, 1: 1, 2: 2 }); expect(p.count).toBe(2)
    expect(p.stored(null)).toEqual({ 9: 1, 1: 1, 2: 2 }) // unreadable: keep the last one known
    full.on = false
    expect(p.change({ t: 'set', ch: { 1: 0 } }, w)).toEqual({ value: { 9: 1, 2: 2 }, ok: true }); expect(p.count).toBe(0)
    expect(JSON.parse(m.get('gwent-own')!)).toEqual({ 9: 1, 2: 2 })
  })
  it('own ops: set some cards on top of the latest · all = exactly the file', () => {
    expect(applyOwnOp({ 1: 1, 3: 1 }, { t: 'set', ch: { 1: 2, 3: 0 } })).toEqual({ 1: 2 })
    expect(applyOwnOp({ 1: 1, 3: 1 }, { t: 'all', own: { 5: 1 } })).toEqual({ 5: 1 })
    const s = new Set([1]); expect(applyStarOp(s, { id: 1, on: true })).toBe(s)
    expect(applyStarOp(s, { id: 2, on: true })).toEqual(new Set([1, 2])); expect(applyStarOp(s, { id: 1, on: false })).toEqual(new Set())
  })
})
