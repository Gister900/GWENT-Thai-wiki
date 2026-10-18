// The site open in two tabs of one browser (same localStorage): a change in one tab must never wipe what the other
// tab saved (decks · collection · stars), the other tab shows it without a reload, and each tab keeps its own open deck.
// Two pages in one browser context, at 2560 and 390, on the built single file (file://). Fails on any console error.
import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { FILE, VPS, deckView, mobile, nav, open, toAll } from './helpers'

test.skip(!existsSync(FILE), 'run npm run build:single first')

type Stored = { id: string; name: string; f: string; L: number | null; c: Record<string, number> }
const stored = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem('gwent-decks') || 'null') as Stored[])
const options = (p: Page) => p.locator('#deckSel option').allTextContents()
async function act(p: Page, id: string) { if (mobile(p) && !(await p.isVisible('#' + id))) await p.click('#deckMore'); await p.click('#' + id) }
/** a second tab in the same browser (shares localStorage with the first) */
async function tab(ctx: BrowserContext, errs: string[], url = 'file://' + FILE) {
  const p = await ctx.newPage()
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('pageerror', e => errs.push('pageerror: ' + e.message))
  p.on('dialog', d => d.accept())
  await p.goto(url); await p.waitForSelector('#home .ftile')
  return p
}
/** put the first card that can go in into the open deck */
async function addOne(p: Page) {
  await deckView(p, 'pick')
  await p.locator('#dPick .gc:not(.in-deck):not(.blk)').first().locator('[data-act=add]').click()
  await p.waitForTimeout(150)
}
const total = (d: Stored) => Object.values(d.c).reduce((a, b) => a + b, 0)

for (const [name, vp, dsf] of VPS) {
  test(`(a) tab B makes a new deck, tab A adds a card: both decks stay — ${name}`, async ({ browser }) => {
    const { ctx, p: A, errs } = await open(browser, vp, dsf, undefined, { home: true })
    await nav(A, 'deck'); await A.selectOption('#dFac', 'Monster')
    const B = await tab(ctx, errs)
    await nav(B, 'deck'); await act(B, 'deckNew'); await B.selectOption('#dFac', 'Skellige')
    // A was not pulled to B's new deck, but its list already shows it
    expect(await A.inputValue('#dFac')).toBe('Monster')
    await expect.poll(() => options(A)).toEqual(['เดค 1 · Monsters · 0', 'เดค 2 · Skellige · 0'])
    await addOne(A)
    const s = await stored(A)
    expect(s.map(d => [d.name, d.f])).toEqual([['เดค 1', 'Monster'], ['เดค 2', 'Skellige']])
    expect(total(s[0])).toBe(1); expect(total(s[1])).toBe(0)
    await expect.poll(() => options(B)).toEqual(['เดค 1 · Monsters · 1', 'เดค 2 · Skellige · 0'])
    expect(await B.inputValue('#dFac')).toBe('Skellige')
    expect(errs).toEqual([])
    await ctx.close()
  })

  test(`(b) tab B imports a #deck= link, tab A edits its deck: the import stays and A lists it without a reload — ${name}`, async ({ browser }) => {
    const { ctx, p: A, errs } = await open(browser, vp, dsf, undefined, { home: true })
    await nav(A, 'deck'); await A.selectOption('#dFac', 'Monster'); await addOne(A)
    await act(A, 'deckShare'); await expect(A.locator('#shareDlg')).toBeVisible()
    const link = await A.inputValue('#shareLink'); await A.keyboard.press('Escape'); await expect(A.locator('#shareDlg')).toBeHidden()
    await act(A, 'deckRename'); await A.fill('#renameIn', 'Mine'); await A.click('#renameOk')
    // a friend's link opens in a new tab and is imported there
    const B = await tab(ctx, errs, link)
    await expect(B.locator('#linkDlg')).toBeVisible(); await B.click('#linkYes'); await expect(B.locator('#deck')).toBeVisible()
    expect(await stored(B)).toHaveLength(2)
    await expect.poll(() => options(A)).toHaveLength(2)
    expect((await options(A))[0]).toBe('Mine · Monsters · 1')
    // A edits its own deck once
    await addOne(A)
    const s = await stored(A)
    expect(s).toHaveLength(2)
    expect(s[0].name).toBe('Mine'); expect(total(s[0])).toBe(2)
    expect(s[1].f).toBe('Monster'); expect(total(s[1])).toBe(1)
    expect(await A.inputValue('#deckSel')).toBe(s[0].id)
    expect(errs).toEqual([])
    await ctx.close()
  })

  test(`(c) tab A deletes the deck tab B shows: B switches to another deck with a message — ${name}`, async ({ browser }) => {
    const { ctx, p: A, errs } = await open(browser, vp, dsf, undefined, { home: true })
    await nav(A, 'deck'); await A.selectOption('#dFac', 'Monster')
    await act(A, 'deckNew'); await A.selectOption('#dFac', 'Skellige')
    const B = await tab(ctx, errs) // opens on the deck A opened last (deck 2)
    await nav(B, 'deck'); expect(await B.inputValue('#dFac')).toBe('Skellige')
    // A goes back to deck 1: B stays on deck 2
    const ids = (await stored(A)).map(d => d.id)
    await A.selectOption('#deckSel', ids[0]); await A.waitForTimeout(150)
    expect(await B.inputValue('#deckSel')).toBe(ids[1])
    await A.selectOption('#deckSel', ids[1]); await act(A, 'deckDel')
    await expect(B.locator('#toast')).toContainText('“เดค 2” ถูกลบในแท็บอื่น จึงเปิด “เดค 1” แทน')
    expect(await options(B)).toEqual(['เดค 1 · Monsters · 0'])
    expect(await B.inputValue('#dFac')).toBe('Monster')
    await addOne(B) // still works after the switch
    expect((await stored(B)).map(d => [d.id, total(d)])).toEqual([[ids[0], 1]])
    expect(errs).toEqual([])
    await ctx.close()
  })

  test(`(d) stars and collection ticked in two tabs: both are kept — ${name}`, async ({ browser }) => {
    const { ctx, p: A, errs } = await open(browser, vp, dsf)
    const B = await tab(ctx, errs); await toAll(B); await B.waitForTimeout(300)
    const card = (p: Page, n: number) => p.locator('#grid .gc:has([data-act=own])').nth(n) // leader abilities have no own button
    const idA = await card(A, 0).getAttribute('data-id'), idB = await card(B, 1).getAttribute('data-id')
    await card(A, 0).locator('[data-act=star]').click(); await card(B, 1).locator('[data-act=star]').click()
    await card(A, 0).locator('[data-act=own]').click(); await card(B, 1).locator('[data-act=own]').click()
    const ls = await A.evaluate(() => [JSON.parse(localStorage.getItem('gwent-stars')!), JSON.parse(localStorage.getItem('gwent-own')!)])
    expect([...ls[0]].sort()).toEqual([+idA!, +idB!].sort())
    expect(Object.keys(ls[1]).sort()).toEqual([idA, idB].sort())
    // each tab shows the other's change without a reload
    await expect(card(A, 1).locator('[data-act=star]')).toHaveAttribute('aria-pressed', 'true')
    await expect(card(B, 0).locator('[data-act=star]')).toHaveAttribute('aria-pressed', 'true')
    await expect(card(A, 1).locator('[data-act=own]')).toHaveText(/1\//)
    await expect(card(B, 0).locator('[data-act=own]')).toHaveText(/1\//)
    expect(errs).toEqual([])
    await ctx.close()
  })
}

const FAIL = { th: 'บันทึกลงเบราว์เซอร์ไม่สำเร็จ', en: 'Could not save in this browser' } as const
const ownCard = (p: Page, n: number) => p.locator('#grid .gc:has([data-act=own])').nth(n) // leader abilities have no own button

for (const [name, vp, dsf] of VPS) for (const lang of ['th', 'en'] as const) {
  test(`(e) storage full: the warning wins, unsaved cards stay on screen, all are saved once it works — ${name} ${lang}`, async ({ browser }) => {
    const { ctx, p, errs } = await open(browser, vp, dsf, { 'gwent-lang': lang }, { home: true })
    await nav(p, 'deck'); await p.selectOption('#dFac', 'Monster')
    await p.evaluate(() => {
      const w = window as unknown as { __setItem: Storage['setItem'] }; w.__setItem = Storage.prototype.setItem
      Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError') }
    })
    await addOne(p)
    await expect(p.locator('#toast')).toContainText(FAIL[lang]); await expect(p.locator('#toast')).toHaveAttribute('data-level', 'error')
    expect(total((await stored(p))[0])).toBe(0)
    await addOne(p) // the first card must stay on screen
    await expect(p.locator('#toast')).toContainText(FAIL[lang])
    await expect.poll(async () => (await options(p))[0]).toMatch(/ · 2$/)
    expect(total((await stored(p))[0])).toBe(0)
    await p.evaluate(() => { Storage.prototype.setItem = (window as unknown as { __setItem: Storage['setItem'] }).__setItem })
    await addOne(p)
    await expect.poll(async () => (await options(p))[0]).toMatch(/ · 3$/)
    expect(total((await stored(p))[0])).toBe(3)
    expect(errs).toEqual([])
    await ctx.close()
  })
}

for (const [name, vp, dsf] of VPS) {
  test(`(f) localStorage.clear() in another tab: collection and stars follow — ${name}`, async ({ browser }) => {
    const { ctx, p: A, errs } = await open(browser, vp, dsf)
    await ownCard(A, 0).locator('[data-act=star]').click(); await ownCard(A, 0).locator('[data-act=own]').click()
    await expect(ownCard(A, 0).locator('[data-act=star]')).toHaveAttribute('aria-pressed', 'true')
    await expect(ownCard(A, 0).locator('[data-act=own]')).toHaveText(/1\//)
    const B = await tab(ctx, errs)
    await B.evaluate(() => localStorage.clear())
    await expect(ownCard(A, 0).locator('[data-act=star]')).toHaveAttribute('aria-pressed', 'false')
    await expect(ownCard(A, 0).locator('[data-act=own]')).toHaveText(/0\//)
    expect(errs).toEqual([])
    await ctx.close()
  })

  test(`(g) collection import replaces it with exactly the file, even right after another tab ticked a card — ${name}`, async ({ browser }) => {
    const { ctx, p: A, errs } = await open(browser, vp, dsf)
    const B = await tab(ctx, errs); await toAll(B); await B.waitForTimeout(300)
    const idA = await ownCard(A, 0).getAttribute('data-id')
    await ownCard(B, 1).locator('[data-act=own]').click()
    await A.setInputFiles('#ownImp', { name: 'c.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ type: 'gwent-collection', version: 1, own: { [idA!]: 1 } })) })
    await expect.poll(() => A.evaluate(() => localStorage.getItem('gwent-own'))).toBe(JSON.stringify({ [idA!]: 1 }))
    await expect(ownCard(A, 1).locator('[data-act=own]')).toHaveText(/0\//)
    await expect(ownCard(B, 1).locator('[data-act=own]')).toHaveText(/0\//)
    await expect(ownCard(B, 0).locator('[data-act=own]')).toHaveText(/1\//)
    expect(errs).toEqual([])
    await ctx.close()
  })
}
