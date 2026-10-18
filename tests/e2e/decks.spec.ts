// Several decks (gwent-decks), the move of the old gwent-deck into "เดค 1", deck links (#deck=…), export/import,
// and the "What's new" dot — at 2560 and 390, on the built single file (file://). Fails on any console error.
import { test, expect, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { FILE, VPS, deckView, mobile, nav, open, sp } from './helpers'

test.skip(!existsSync(FILE), 'run npm run build:single first')

type C = { id: number; n: string; f: string; t: string; c: string }
const CARDS = JSON.parse(readFileSync(fileURLToPath(new URL('../../src/data/cards.json', import.meta.url)), 'utf8')) as C[]
/** a legal 25-card Monster deck with a leader (Bronze ×2) */
function bigDeck() {
  const L = CARDS.find(c => c.t === 'Ability' && c.f === 'Monster')!.id
  const c: Record<string, number> = {}; let n = 0
  for (const x of CARDS.filter(x => x.f === 'Monster' && x.t === 'Unit')) { if (n >= 25) break; const k = x.c === 'Bronze' && n < 24 ? 2 : 1; c[x.id] = k; n += k }
  return { f: 'Monster', L, c }
}
const BIG = bigDeck()
const OLD = '{"f":"Monster","L":131101,"c":{"112405":2,"131102":1,"132211":1}}'

/** click a deck-bar button (on the phone the actions sit behind "⋯") */
async function act(p: Page, id: string) { if (mobile(p) && !(await p.isVisible('#' + id))) await p.click('#deckMore'); await p.click('#' + id) }
const options = (p: Page) => p.locator('#deckSel option').allTextContents()
const stored = (p: Page) => p.evaluate(() => ({ list: JSON.parse(localStorage.getItem('gwent-decks') || 'null') as { id: string; name: string; f: string; L: number | null; c: Record<string, number> }[], active: localStorage.getItem('gwent-deck-active') }))
const activeDeck = async (p: Page) => { const s = await stored(p); return s.list.find(d => d.id === s.active)! }

for (const [name, vp, dsf] of VPS) {
  test(`old gwent-deck moves in as "เดค 1" with every card, old key kept — ${name}`, async ({ browser }) => {
    const { ctx, p, errs } = await open(browser, vp, dsf, { 'gwent-deck': OLD }, { home: true })
    await nav(p, 'deck')
    expect(await options(p)).toEqual(['เดค 1 · Monsters · 4'])
    expect(await p.inputValue('#dFac')).toBe('Monster'); expect(await p.inputValue('#dLead')).toBe('131101')
    await deckView(p, 'deck')
    const list = sp(await p.textContent('#dList'))
    for (const s of ["Ge'els", 'Fiend', 'Nekker Warrior', '×2']) expect(list).toContain(s)
    expect(sp(await p.textContent('#dHead'))).toContain('4/25')
    const s = await stored(p)
    expect(s.list).toHaveLength(1); expect(s.list[0]).toMatchObject({ name: 'เดค 1', f: 'Monster', L: 131101, c: { 112405: 2, 131102: 1, 132211: 1 } }); expect(s.active).toBe(s.list[0].id)
    expect(await p.evaluate(() => localStorage.getItem('gwent-deck'))).toBe(OLD)
    // runs once: after a reload the list is read as it is
    await p.reload(); await p.waitForSelector('#home .ftile')
    expect((await stored(p)).list.map(d => d.id)).toEqual(s.list.map(d => d.id))
    expect(errs).toEqual([])
    await ctx.close()
  })

  test(`two decks: create, switch, rename, delete — ${name}`, async ({ browser }) => {
    const { ctx, p, errs } = await open(browser, vp, dsf, undefined, { home: true })
    await nav(p, 'deck')
    await p.selectOption('#dFac', 'Monster')
    await act(p, 'deckNew')
    expect(await options(p)).toEqual(['เดค 1 · Monsters · 0', 'เดค 2 · (ว่าง)'])
    expect(await p.inputValue('#dFac')).toBe('')
    await p.selectOption('#dFac', 'Skellige')
    const ids = (await stored(p)).list.map(d => d.id)
    await p.selectOption('#deckSel', ids[0]); expect(await p.inputValue('#dFac')).toBe('Monster')
    await p.selectOption('#deckSel', ids[1]); expect(await p.inputValue('#dFac')).toBe('Skellige')
    if (!mobile(p)) { await p.selectOption('#sideDeckSel', ids[0]); expect(await p.inputValue('#dFac')).toBe('Monster'); await p.selectOption('#sideDeckSel', ids[1]) }
    await act(p, 'deckRename'); await expect(p.locator('#renameDlg')).toBeVisible()
    await p.fill('#renameIn', 'Ships ⚓'); await p.click('#renameOk'); await expect(p.locator('#renameDlg')).toBeHidden()
    expect(await options(p)).toEqual(['เดค 1 · Monsters · 0', 'Ships ⚓ · Skellige · 0'])
    expect((await activeDeck(p)).name).toBe('Ships ⚓')
    await act(p, 'deckDel') // confirm() is accepted by the helper
    await expect(p.locator('#toast')).toContainText('ลบเดค Ships ⚓ แล้ว')
    expect(await options(p)).toEqual(['เดค 1 · Monsters · 0']); expect(await p.inputValue('#dFac')).toBe('Monster')
    // deleting the last deck leaves a fresh empty one
    await act(p, 'deckDel'); expect(await options(p)).toEqual(['เดค 1 · (ว่าง)'])
    expect(errs).toEqual([])
    await ctx.close()
  })

  test(`deck link: copy, open in a new page, preview, import = same deck · broken link warns — ${name}`, async ({ browser }) => {
    const { ctx, p, errs } = await open(browser, vp, dsf, { 'gwent-deck': JSON.stringify(BIG) }, { home: true })
    await nav(p, 'deck'); await act(p, 'deckShare')
    await expect(p.locator('#shareDlg')).toBeVisible(); await expect(p.locator('#toast')).toContainText('ลิงก์เดค')
    const link = await p.inputValue('#shareLink')
    const code = link.split('#deck=')[1]
    expect(link.startsWith('file://')).toBe(true); expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    if (name === 'desktop') console.log(`deck link (25 cards): code ${code.length} chars · full link ${link.length} chars (file://) · on the web ${'https://gister900.github.io/GWENT-Thai-wiki/#deck='.length + code.length} chars\n  ${code}`)
    await ctx.close()

    // someone else opens it: fresh browser storage
    const ctx2 = await browser.newContext({ viewport: vp, deviceScaleFactor: dsf }); const q = await ctx2.newPage(); const e2: string[] = []
    q.on('console', m => { if (m.type() === 'error') e2.push(m.text()) }); q.on('pageerror', e => e2.push(e.message))
    await q.goto(link); await expect(q.locator('#linkDlg')).toBeVisible()
    await expect(q.locator('#linkPv [data-pv=fac]')).toHaveText('Monsters')
    await expect(q.locator('#linkPv [data-pv=leader]')).toHaveText(CARDS.find(c => c.id === BIG.L)!.n)
    await expect(q.locator('#linkPv [data-pv=cards]')).toContainText('25 ใบ')
    expect(q.url()).not.toContain('#deck=') // hash cleared right away
    await q.click('#linkYes'); await expect(q.locator('#deck')).toBeVisible()
    const s = await stored(q)
    expect(s.list).toHaveLength(2) // the empty first-visit deck + the imported one
    expect(await activeDeck(q)).toMatchObject({ f: BIG.f, L: BIG.L, c: BIG.c })
    expect(await q.inputValue('#dLead')).toBe(String(BIG.L))
    // broken link: warning, nothing imported, no crash
    const q2 = await ctx2.newPage(); q2.on('console', m => { if (m.type() === 'error') e2.push(m.text()) }); q2.on('pageerror', e => e2.push(e.message))
    await q2.goto(link.split('#')[0] + '#deck=AQB_garbage'); await q2.waitForSelector('#home .ftile')
    await expect(q2.locator('#toast')).toContainText('ลิงก์เดคนี้เสียหรืออ่านไม่ได้'); await expect(q2.locator('#linkDlg')).toBeHidden()
    expect(q2.url()).not.toContain('#deck=')
    // a link pasted into the tab that is already open (hash change only) works the same way
    await q.evaluate(() => { location.hash = 'deck=%%%' }); await expect(q.locator('#toast')).toContainText('ลิงก์เดคนี้เสียหรืออ่านไม่ได้')
    expect((await stored(q)).list).toHaveLength(2)
    expect(errs).toEqual([]); expect(e2).toEqual([])
    await ctx2.close()
  })

  test(`export then import adds one equal deck · export all — ${name}`, async ({ browser }) => {
    const { ctx, p, errs } = await open(browser, vp, dsf, { 'gwent-deck': OLD }, { home: true, acceptDownloads: true })
    await nav(p, 'deck')
    const [dl] = await Promise.all([p.waitForEvent('download'), act(p, 'deckExp')])
    expect(dl.suggestedFilename()).toMatch(/^gwent-deck-.*\.json$/)
    const file = await dl.path()
    const data = JSON.parse(readFileSync(file, 'utf8')); expect(data).toMatchObject({ type: 'gwent-decks', version: 1 }); expect(data.decks).toHaveLength(1)
    if (mobile(p)) await p.click('#deckMore')
    await p.setInputFiles('#deckImp', file)
    await expect(p.locator('#toast')).toContainText('นำเข้า 1 เดคแล้ว')
    const s = await stored(p); expect(s.list).toHaveLength(2)
    expect(s.list[1]).toMatchObject({ name: 'เดค 1', f: 'Monster', L: 131101, c: { 112405: 2, 131102: 1, 132211: 1 } }); expect(s.active).toBe(s.list[1].id)
    const [dl2] = await Promise.all([p.waitForEvent('download'), act(p, 'deckExpAll')])
    expect(JSON.parse(readFileSync(await dl2.path(), 'utf8')).decks).toHaveLength(2)
    // a file that breaks the rules is refused
    if (mobile(p)) await p.click('#deckMore')
    await p.setInputFiles('#deckImp', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ type: 'gwent-decks', version: 1, decks: [{ f: 'Monster', L: null, c: { 112405: 3 } }] })) })
    await expect(p.locator('#toast')).toContainText('จำนวนก๊อปเกินกติกา'); expect((await stored(p)).list).toHaveLength(2)
    expect(errs).toEqual([])
    await ctx.close()
  })

  test(`"What's new" dot goes away after opening the guide — ${name}`, async ({ browser }) => {
    const { ctx, p, errs } = await open(browser, vp, dsf, undefined, { home: true })
    const dot = p.locator(`${mobile(p) ? '.bottomnav' : '.side'} [data-tab=guide] .newsdot`)
    await expect(dot).toBeVisible()
    await nav(p, 'guide'); await expect(p.locator('#guide')).toBeVisible()
    await expect(p.locator('#whatsnew .news-item')).toHaveCount(2)
    await expect(dot).toHaveCount(0)
    for (const id of ['g-search', 'g-modal', 'g-coll', 'g-deck', 'g-data', 'g-keys', 'g-lang', 'whatsnew']) await expect(p.locator('#' + id)).toHaveCount(1)
    expect(await p.evaluate(() => localStorage.getItem('gwent-seen-changelog'))).toBe('1.1')
    await p.reload(); await p.waitForSelector('#home .ftile'); await expect(dot).toHaveCount(0)
    expect(errs).toEqual([])
    await ctx.close()
  })
}
