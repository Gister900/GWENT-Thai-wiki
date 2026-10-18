// e2e of build:web (GitHub Pages build) served under BASE: card images come from the site's own art/ folder,
// nothing 404s, and nothing is hot-linked from playgwent.com / gwent.one — except tokens with no local file
// (no `lq`), which fall back to gwent.one like build:single (src/lib/art.ts).
import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE || '/GWENT-Thai-wiki/'
const TOK = JSON.parse(readFileSync(fileURLToPath(new URL('../../src/data/tokens.json', import.meta.url)), 'utf8')) as Record<string, { art: number; lq?: string }>
/** gwent.one art ids the app may load: tokens that have no self-hosted file */
const FALLBACK = new Set(Object.values(TOK).filter(t => !t.lq).map(t => String(t.art)))
/** card for the fallback test: unique name in search, gwent.one has its art at some size (`na` != 3) */
const CARDS = JSON.parse(readFileSync(fileURLToPath(new URL('../../src/data/cards.json', import.meta.url)), 'utf8')) as { id: number; n: string; na?: number }[]
const PICK = CARDS.find(c => (c.na || 0) !== 3 && CARDS.filter(x => x.n.toLowerCase().includes(c.n.toLowerCase())).length === 1)!
const PICK_FILE = 'c' + PICK.id + '.webp'

function watch(p: Page) {
  const errs: string[] = [], bad: string[] = [], remote: string[] = []
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('pageerror', e => errs.push('pageerror: ' + e.message))
  p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()) })
  p.on('requestfailed', r => bad.push('failed ' + r.url()))
  p.on('request', r => { const u = r.url(); if (/playgwent\.com|gwent\.one/.test(u)) remote.push(u) })
  return { errs, bad, remote }
}
/** every card <img> on screen that has loaded (the site logo is not card art): its url (all must be under BASE/art/l/) */
const imgs = (p: Page) => p.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('img:not(.logo)')].filter(i => i.complete && i.naturalWidth > 0 && !i.src.startsWith('data:')).map(i => i.src))
const own = (u: string, origin: string) => u.startsWith(origin + BASE + 'art/l/') && u.endsWith('.webp')

test('web build: home, all cards and the modal load images from the site itself', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  const p = await ctx.newPage(); const w = watch(p); const origin = new URL(baseURL!).origin
  await p.goto(baseURL!); await p.waitForSelector('#home .ftile'); await p.waitForLoadState('networkidle')
  const home = await imgs(p)
  expect(home.length).toBeGreaterThan(5)
  for (const u of home) expect(own(u, origin), u).toBe(true)
  // all-cards grid: scroll a few screens so lazy tiles load
  await p.click('#homeAll'); await p.waitForSelector('#grid article')
  for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, 900); await p.waitForTimeout(250) }
  await p.waitForLoadState('networkidle')
  const grid = await imgs(p)
  expect(grid.length).toBeGreaterThan(20)
  for (const u of grid) expect(own(u, origin), u).toBe(true)
  // modal (large view) + a related token
  await p.fill('#q', 'botchling'); await p.waitForTimeout(400)
  await p.locator('#grid .gc .name').first().click(); await expect(p.locator('#mback')).toBeVisible()
  await p.waitForLoadState('networkidle')
  const modal = await p.locator('#modal img').evaluateAll(e => (e as HTMLImageElement[]).filter(i => i.naturalWidth > 0).map(i => i.src))
  expect(modal.length).toBeGreaterThan(0)
  for (const u of modal) expect(own(u, origin), u).toBe(true)
  await p.click('#mClose')
  // About dialog: a click on its padding keeps it open, a click on the backdrop closes it
  await p.click('#aboutOpen'); const dlg = p.locator('#aboutDlg'); await expect(dlg).toBeVisible()
  const box = (await dlg.boundingBox())!
  await p.mouse.click(box.x + 4, box.y + 4); await expect(dlg).toBeVisible()
  await p.mouse.click(box.x + box.width / 2, Math.max(2, box.y - 10)); await expect(dlg).toBeHidden()

  expect(w.bad).toEqual([])
  expect(w.remote.filter(u => !(u.startsWith('https://gwent.one/img/assets/') && FALLBACK.has(u.replace(/.*\/(\d+)\.jpg$/, '$1'))))).toEqual([])
  expect(w.errs).toEqual([])
  await ctx.close()
})

test('web build: a self-hosted image that fails falls back to gwent.one', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  // break one local file, and answer gwent.one locally (no real network in the test)
  const tiny = readFileSync(fileURLToPath(new URL('../../public/art/l/' + PICK_FILE, import.meta.url)))
  await p.route('**/art/l/' + PICK_FILE, r => r.fulfill({ status: 404, body: '' }))
  const hits: string[] = []
  await p.route('https://gwent.one/**', r => { hits.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'image/webp', body: tiny }) })
  await p.goto(baseURL!); await p.waitForSelector('#home .ftile')
  await p.click('#homeAll'); await p.waitForSelector('#grid article')
  await p.fill('#q', PICK.n); await p.waitForTimeout(400)
  await expect.poll(() => hits.length).toBeGreaterThan(0)
  expect(hits[0]).toMatch(/^https:\/\/gwent\.one\/img\/assets\/(low|medium)\/art\/\d+\.jpg$/)
  await expect(p.locator('#grid .gc').first().locator('img')).toHaveAttribute('src', /gwent\.one/)
  await ctx.close()
})


test('web build: a deck link under the base path opens the import dialog and imports the deck', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage(); const w = watch(p)
  // Monster deck: leader 131101 (Carapace) + Ge'els + Fiend ×2 (same cards as the e2e seed)
  await p.goto(baseURL!); await p.waitForSelector('#home .ftile')
  await p.evaluate(() => { localStorage.setItem('gwent-deck', '{"f":"Monster","L":131101,"c":{"112405":2,"131102":1}}'); localStorage.removeItem('gwent-decks') })
  await p.reload(); await p.waitForSelector('#home .ftile')
  await p.click('.side [data-tab=deck]'); await p.click('#deckShare')
  const link = await p.inputValue('#shareLink')
  expect(link.startsWith(baseURL! + '#deck=')).toBe(true)
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const q = await ctx2.newPage(); const w2 = watch(q)
  await q.goto(link); await expect(q.locator('#linkDlg')).toBeVisible()
  await expect(q.locator('#linkPv [data-pv=cards]')).toContainText('3')
  await q.click('#linkYes')
  expect(new URL(q.url()).pathname).toBe(BASE); expect(q.url()).not.toContain('#deck=')
  const d = await q.evaluate(() => { const l = JSON.parse(localStorage.getItem('gwent-decks')!); return l.find((x: { id: string }) => x.id === localStorage.getItem('gwent-deck-active')) })
  expect(d).toMatchObject({ f: 'Monster', L: 131101, c: { 112405: 2, 131102: 1 } })
  expect(w.errs).toEqual([]); expect(w2.errs).toEqual([]); expect(w.bad).toEqual([]); expect(w2.bad).toEqual([])
  await ctx.close(); await ctx2.close()
})
