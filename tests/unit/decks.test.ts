import { describe, expect, it } from 'vitest'
import { BYID, CARDS } from '../../src/lib/data'
import { applyDeckOp, DECKS_FILE_MAX, DeckError, decksExport, dupSource, ensureDeck, initDecks, keepActive, nextDeckName, parseDecksFile, validateDeck, type DeckOp, type SavedDeck } from '../../src/lib/decks'
import { codeFromHash, decodeDeck, deckLink, encodeDeck } from '../../src/lib/deckCode'
import { CHANGELOG, hasNews, NEWEST } from '../../src/content/changelog'
import type { Deck } from '../../src/types'

const THAI = /[฀-๿]/
const OLD = '{"f":"Monster","L":131101,"c":{"112405":2,"131102":1,"132211":1}}'

/** a legal 25-card Monster deck (bronzes ×2 where possible) */
function bigDeck(): Deck {
  const lead = CARDS.find(c => c.t === 'Ability' && c.f === 'Monster')!
  const c: Record<string, number> = {}; let n = 0
  for (const x of CARDS.filter(x => x.f === 'Monster' && x.t !== 'Ability')) { if (n >= 25) break; const k = x.c === 'Bronze' && n < 24 ? 2 : 1; c[x.id] = k; n += k }
  return { f: 'Monster', L: lead.id, c }
}
const code = (e: () => unknown) => { try { e(); return 'ok' } catch (x) { return x instanceof DeckError ? x.code : 'other' } }

describe('migration gwent-deck → gwent-decks', () => {
  it('old single deck becomes "เดค 1" with every card, active, list must be saved', () => {
    const r = initDecks(null, null, OLD, 'th', 5, () => 'id1')
    expect(r.created).toBe(true); expect(r.active).toBe('id1')
    expect(r.decks).toEqual([{ id: 'id1', name: 'เดค 1', f: 'Monster', L: 131101, c: { 112405: 2, 131102: 1, 132211: 1 }, updated: 5 }])
  })
  it('English name in EN mode · no old deck → one empty deck', () => {
    expect(initDecks(null, null, OLD, 'en').decks[0].name).toBe('Deck 1')
    const r = initDecks(null, null, null, 'th', 1, () => 'x'); expect(r.decks).toEqual([{ id: 'x', name: 'เดค 1', f: '', L: null, c: {}, updated: 1 }])
  })
  it('broken old deck → empty deck, no crash', () => { expect(initDecks(null, null, '{oops', 'th').decks[0].f).toBe('') })
  it('runs once: an existing list wins over gwent-deck and is not rewritten', () => {
    const list: SavedDeck[] = [{ id: 'a', name: 'A', f: 'Skellige', L: null, c: {}, updated: 1 }, { id: 'b', name: 'B', f: 'Monster', L: null, c: {}, updated: 2 }]
    const r = initDecks(JSON.stringify(list), 'b', OLD, 'th')
    expect(r.created).toBe(false); expect(r.decks).toEqual(list); expect(r.active).toBe('b')
    expect(initDecks(JSON.stringify(list), 'gone', OLD, 'th').active).toBe('a')
  })
  it('a corrupt list falls back to the old deck', () => { expect(initDecks('nope', null, OLD, 'th').decks[0].c).toEqual({ 112405: 2, 131102: 1, 132211: 1 }) })
  it('next free name', () => { expect(nextDeckName([{ name: 'เดค 1' }, { name: 'เดค 2' }], 'th')).toBe('เดค 3'); expect(nextDeckName([{ name: 'Deck 2' }], 'en')).toBe('Deck 3') })
})

describe('deck link code', () => {
  it('round-trip of a 25-card deck, short code', () => {
    const d = bigDeck(); const s = encodeDeck(d)
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/); expect(s.length).toBeLessThan(80)
    expect(decodeDeck(s, BYID)).toEqual({ f: d.f, L: d.L, c: Object.fromEntries(Object.entries(d.c).map(([k, v]) => [k, v])) })
  })
  it('deck without leader and with no cards', () => {
    expect(decodeDeck(encodeDeck({ f: 'Syndicate', L: null, c: {} }), BYID)).toEqual({ f: 'Syndicate', L: null, c: {} })
  })
  it('broken links throw DeckError, never anything else', () => {
    const s = encodeDeck(bigDeck())
    for (const bad of ['', '!!!', 'AA', s.slice(0, 5) + '*', 'AQ', s.slice(0, s.length - 1) + (s.endsWith('A') ? 'B' : 'A').repeat(3)]) expect(['shape', 'faction', 'leader', 'card', 'copies', 'wrongFac', 'ok']).toContain(code(() => decodeDeck(bad, BYID)))
    expect(code(() => decodeDeck('!!!', BYID))).toBe('shape')
    expect(code(() => decodeDeck('', BYID))).toBe('shape')
  })
  it('unknown card id / wrong faction / too many copies in a link are rejected', () => {
    expect(code(() => decodeDeck(encodeDeck({ f: 'Monster', L: null, c: { 999999: 1 } }), BYID))).toBe('card')
    const nf = CARDS.find(c => c.f === 'Nilfgaard' && c.t === 'Unit')!
    expect(code(() => decodeDeck(encodeDeck({ f: 'Monster', L: null, c: { [nf.id]: 1 } }), BYID))).toBe('wrongFac')
    const gold = CARDS.find(c => c.f === 'Monster' && c.c === 'Gold' && c.t === 'Unit')!
    expect(code(() => decodeDeck(encodeDeck({ f: 'Monster', L: null, c: { [gold.id]: 2 } }), BYID))).toBe('copies')
  })
  it('link keeps base path / file path and reads back from the hash', () => {
    const d = bigDeck()
    const web = deckLink('https://x.github.io/GWENT-Thai-wiki/#g-deck', d)
    expect(web.startsWith('https://x.github.io/GWENT-Thai-wiki/#deck=')).toBe(true)
    const file = deckLink('file:///D:/a/GWENT-Thai-wiki.html', d)
    expect(decodeDeck(codeFromHash(new URL(file).hash)!, BYID).L).toBe(d.L)
    expect(codeFromHash('#g-deck')).toBeNull(); expect(codeFromHash('#deck=%E0%A4')).toBe('')
  })
})

describe('import file check', () => {
  it('export → parse gives the same decks', () => {
    const d = bigDeck(); const saved: SavedDeck[] = [{ ...d, id: 'a', name: 'My deck', updated: 1 }, { f: 'Skellige', L: null, c: {}, id: 'b', name: 'Empty', updated: 2 }]
    const back = parseDecksFile(JSON.stringify(decksExport(saved, new Date(0))), BYID)
    expect(back.map(x => x.name)).toEqual(['My deck', 'Empty']); expect(back[0].deck.c).toEqual(d.c); expect(back[0].deck.L).toBe(d.L)
  })
  it('rejects other files and decks breaking the rules', () => {
    expect(code(() => parseDecksFile('not json', BYID))).toBe('shape')
    expect(code(() => parseDecksFile('{"type":"gwent-collection","own":{}}', BYID))).toBe('shape')
    const f = (deck: unknown) => JSON.stringify({ type: 'gwent-decks', version: 1, decks: [deck] })
    expect(code(() => parseDecksFile(f({ f: 'Neutral', L: null, c: {} }), BYID))).toBe('faction')
    expect(code(() => parseDecksFile(f({ f: 'Monster', L: 112405, c: {} }), BYID))).toBe('leader')
    expect(code(() => parseDecksFile(f({ f: 'Monster', L: null, c: { 1: 1 } }), BYID))).toBe('card')
    expect(code(() => parseDecksFile(f({ f: 'Monster', L: null, c: { 112405: 3 } }), BYID))).toBe('copies')
    expect(code(() => parseDecksFile(f({ f: 'Monster', L: null, c: { 112405: '2' } }), BYID))).toBe('copies')
  })
  it('rejects an unknown file version and too many decks', () => {
    const ok = { f: 'Monster', L: null, c: {} }
    const file = (version: unknown, n: number) => JSON.stringify({ type: 'gwent-decks', version, decks: Array.from({ length: n }, () => ok) })
    expect(code(() => parseDecksFile(file(1, 1), BYID))).toBe('ok')
    for (const v of [2, 0, '1', null, undefined]) expect(code(() => parseDecksFile(file(v, 1), BYID))).toBe('version')
    expect(code(() => parseDecksFile(file(1, DECKS_FILE_MAX), BYID))).toBe('ok')
    expect(code(() => parseDecksFile(file(1, DECKS_FILE_MAX + 1), BYID))).toBe('tooMany')
  })
  it('checks type, then version, then shape: a newer file says "version" even when its shape changed', () => {
    expect(code(() => parseDecksFile('{"type":"gwent-decks","version":2}', BYID))).toBe('version')
    expect(code(() => parseDecksFile('{"type":"gwent-decks","version":2,"decks":{}}', BYID))).toBe('version')
    expect(code(() => parseDecksFile('{"type":"gwent-decks","version":1,"decks":[]}', BYID))).toBe('shape')
    expect(code(() => parseDecksFile('{"type":"other","version":2}', BYID))).toBe('shape')
    expect(code(() => parseDecksFile('null', BYID))).toBe('shape')
  })
  it('validateDeck accepts Neutral cards', () => {
    const nl = CARDS.find(c => c.f === 'Neutral' && c.t === 'Unit')!
    expect(validateDeck({ f: 'Monster', L: null, c: { [nl.id]: 1 } }, BYID).c).toEqual({ [nl.id]: 1 })
  })
})

describe("what's new", () => {
  it('newest first, unique versions, th/en same length, en without Thai', () => {
    expect(new Set(CHANGELOG.map(e => e.version)).size).toBe(CHANGELOG.length)
    for (const e of CHANGELOG) { expect(e.en.length).toBe(e.th.length); expect(e.en.join(' ')).not.toMatch(THAI) }
    expect(CHANGELOG.map(e => e.date)).toEqual([...CHANGELOG.map(e => e.date)].sort().reverse())
  })
  it('dot while the newest entry is unseen', () => { expect(hasNews(null)).toBe(true); expect(hasNews('1.0')).toBe(NEWEST !== '1.0'); expect(hasNews(NEWEST)).toBe(false) })
})

describe('several tabs', () => {
  it('keepActive: same id when it still exists · else the deck before it · else the first', () => {
    const L = (...ids: string[]) => ids.map(id => ({ id }))
    expect(keepActive(L('a', 'b', 'c'), L('a', 'b', 'c', 'd'), 'b')).toBe('b')
    expect(keepActive(L('a', 'b', 'c'), L('a', 'c'), 'b')).toBe('a')
    expect(keepActive(L('a', 'b', 'c'), L('c'), 'b')).toBe('c')
    expect(keepActive(L('a'), L('x'), 'gone')).toBe('x')
  })
})

describe('deck ops (replayed on the latest stored list)', () => {
  const D = (id: string, f = 'Monster', c: Record<string, number> = {}): SavedDeck => ({ id, name: id, f, L: null, c, updated: 0 })
  const ids = (l: SavedDeck[]) => l.map(d => d.id)
  it('set: changes the deck · puts it back when another tab deleted it · no src: unchanged', () => {
    const op: DeckOp = { t: 'set', id: 'b', deck: { f: 'Skellige', L: null, c: { 1: 1 } }, at: 5, src: D('b') }
    const r = applyDeckOp([D('a'), D('b')], op); expect(r[1]).toEqual({ ...D('b', 'Skellige', { 1: 1 }), updated: 5 }); expect(r[0]).toEqual(D('a'))
    expect(ids(applyDeckOp([D('a')], op))).toEqual(['a', 'b']); expect(applyDeckOp([D('a')], op)[1].f).toBe('Skellige')
    const l = [D('a')]; expect(applyDeckOp(l, { ...op, src: undefined })).toBe(l)
  })
  it('add: appends decks not there yet (replay does not add twice)', () => {
    const op: DeckOp = { t: 'add', decks: [D('x'), D('y')] }
    const once = applyDeckOp([D('a')], op); expect(ids(once)).toEqual(['a', 'x', 'y']); expect(applyDeckOp(once, op)).toBe(once)
  })
  it('dup: copy right after the stored source (with its latest cards) · source gone: from src, at the end · replay: once', () => {
    const op: DeckOp = { t: 'dup', id: 'a', src: D('a', 'Monster', { 1: 1 }), copy: { id: 'a2', name: 'copy', updated: 9 } }
    const r = applyDeckOp([D('a', 'Monster', { 2: 2 }), D('b')], op)
    expect(ids(r)).toEqual(['a', 'a2', 'b']); expect(r[1]).toEqual({ ...D('a', 'Monster', { 2: 2 }), id: 'a2', name: 'copy', updated: 9 })
    expect(r[1].c).not.toBe(r[0].c)
    const gone = applyDeckOp([D('b')], op); expect(ids(gone)).toEqual(['b', 'a2']); expect(gone[1].c).toEqual({ 1: 1 })
    expect(applyDeckOp(r, op)).toBe(r)
    expect(dupSource([D('z'), D('a')], 'a', D('q')).i).toBe(1); expect(dupSource([], 'a', D('q')).deck.id).toBe('q')
  })
  it('rename · del · deleting the last deck leaves the fresh one (same on replay)', () => {
    expect(applyDeckOp([D('a'), D('b')], { t: 'rename', id: 'b', name: 'New' })[1].name).toBe('New')
    expect(ids(applyDeckOp([D('a'), D('b')], { t: 'del', id: 'a', fresh: D('f') }))).toEqual(['b'])
    const op: DeckOp = { t: 'del', id: 'a', fresh: D('f') }
    const r = applyDeckOp([D('a')], op); expect(ids(r)).toEqual(['f']); expect(ids(applyDeckOp(r, op))).toEqual(['f'])
    expect(ids(ensureDeck([], D('f')))).toEqual(['f']); const l = [D('a')]; expect(ensureDeck(l, D('f'))).toBe(l)
  })
})
