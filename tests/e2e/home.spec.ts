// Cards home (search · faction tiles · rows · deck styles) + faction page + virtual all-cards grid.
import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { FILE, nav, open } from './helpers'

test.skip(!existsSync(FILE), 'run npm run build:single first')
const CARDS = JSON.parse(readFileSync(fileURLToPath(new URL('../../src/data/cards.json', import.meta.url)), 'utf8')) as { id: number; n: string; f: string; v: number }[]
const FO = ['Monster', 'Nilfgaard', 'Northern Realms', 'Scoiatael', 'Skellige', 'Syndicate', 'Neutral']
const D = { width: 2560, height: 1440 }
const n = (s: string | null) => Number((s || '').replace(/\D/g, ''))

test('home: 7 faction tiles · Monsters page sections add up · back home · "/" focuses the big search', async ({ browser }) => {
  const { ctx, p, errs } = await open(browser, D, 1, undefined, { home: true })
  await expect(p.locator('#ftiles .ftile')).toHaveCount(7)
  await expect(p.locator('.side [data-tab=cards]')).toHaveClass(/on/)
  await p.locator('body').click({ position: { x: 1200, y: 5 } }); await p.keyboard.press('/')
  expect(await p.evaluate(() => document.activeElement?.id)).toBe('hq')
  const total = CARDS.filter(c => c.f === 'Monster').length
  expect(n(await p.textContent('#ftiles [data-fac=Monster] .ft-n'))).toBe(total)
  await p.click('#ftiles [data-fac=Monster]'); await p.waitForSelector('#facpage')
  for (const k of ['leader', 'gold', 'bronze']) await expect(p.locator(`#fx-${k} .fsect-hd`)).toBeVisible()
  const counts = await p.locator('#facpage .fsect:not([data-sec=arch]) .fsect-hd .n').allTextContents()
  expect(counts.reduce((s, x) => s + n(x), 0)).toBe(total)
  await expect(p.locator('#facpage .crumbs')).toContainText('Monsters')
  await expect(p.locator('.side [data-tab=cards]')).toHaveClass(/on/)
  // no Neutral cards on a faction page
  expect(await p.locator('#facpage .gc.fc-Neutral').count()).toBe(0)
  // section collapses · faction search
  await p.click('#fx-leader .fsect-hd'); await expect(p.locator('#fx-leader .gc')).toHaveCount(0)
  await p.fill('#fq', 'arachas'); await p.waitForTimeout(300)
  expect(await p.locator('#facpage .gc').count()).toBeGreaterThan(0)
  for (const t of await p.locator('#facpage .gc .name').allTextContents()) expect(t.length).toBeGreaterThan(0)
  await p.click('#facBack'); await expect(p.locator('#ftiles')).toBeVisible()
  // deck style card → that faction's deck styles
  await p.locator('#homeArch .archcard[data-fac=Skellige]').first().click(); await p.waitForTimeout(400)
  await expect(p.locator('#facpage')).toHaveAttribute('data-fac', 'Skellige')
  await expect(p.locator('#fx-arch .arch').first()).toBeInViewport()
  await p.click('#facpage .crumbs [data-crumb=home]'); await expect(p.locator('#ftiles')).toBeVisible()
  expect(errs).toEqual([])
  await ctx.close()
})

test('home search: geralt = 7 grouped by faction · clear brings the home back', async ({ browser }) => {
  const { ctx, p, errs } = await open(browser, D, 1, undefined, { home: true })
  await p.fill('#hq', 'geralt'); await p.waitForTimeout(400)
  await expect(p.locator('#ftiles')).toHaveCount(0)
  await expect(p.locator('#hresN')).toHaveText('7'); await expect(p.locator('#hres .gc')).toHaveCount(7)
  const groups = await p.locator('#hres .rgroup').evaluateAll(g => g.map(x => [(x as HTMLElement).dataset.fac!, x.querySelectorAll('.gc').length, x.querySelector('h3 .n')!.textContent]))
  expect(groups.map(g => g[0])).toEqual(FO.filter(f => groups.some(g => g[0] === f)))
  for (const [, k, t] of groups) expect(n(t as string)).toBe(k)
  expect(groups.reduce((s, g) => s + (g[1] as number), 0)).toBe(7)
  await p.click('#hqClear'); await expect(p.locator('#ftiles')).toBeVisible(); await expect(p.locator('#hq')).toHaveValue('')
  await p.fill('#hq', 'ทำดาเมจ'); await p.waitForTimeout(400); expect(n(await p.textContent('#hresN'))).toBeGreaterThan(60)
  await p.fill('#hq', ''); await expect(p.locator('#ftiles')).toBeVisible()
  expect(errs).toEqual([])
  await ctx.close()
})

test('recent row: 3 opened cards, newest first, kept after reload · row "ดูทั้งหมด" links', async ({ browser }) => {
  const { ctx, p, errs } = await open(browser, D, 1, undefined, { home: true })
  await expect(p.locator('#rowRecent .hrow-empty')).toBeVisible()
  const opened: string[] = []
  for (const q of ['ciri', 'eredin', 'yennefer']) {
    await p.fill('#hq', q); await p.waitForTimeout(400)
    const c = p.locator('#hres .gc').first(); opened.push((await c.getAttribute('data-id'))!)
    await c.locator('.name').click(); await expect(p.locator('#mClose')).toBeVisible(); await p.click('#mClose')
  }
  await p.fill('#hq', ''); const want = [...opened].reverse()
  await expect(p.locator('#rowRecent .gc')).toHaveCount(3)
  expect(await p.locator('#rowRecent .gc').evaluateAll(e => e.map(x => (x as HTMLElement).dataset.id))).toEqual(want)
  expect(JSON.parse((await p.evaluate(() => localStorage.getItem('gwent-recent')))!)).toEqual(want.map(Number))
  await p.reload(); await p.waitForSelector('#home .ftile')
  expect(await p.locator('#rowRecent .gc').evaluateAll(e => e.map(x => (x as HTMLElement).dataset.id))).toEqual(want)
  // "ดูทั้งหมด →" opens the grid with that filter
  await p.click('[data-more=rowRecent]'); await expect(p.locator('#count')).toHaveText('แสดง 3 / 1260 ใบ')
  await expect(p.locator('#activebar [data-chip=recent]')).toBeVisible()
  await nav(p, 'cards'); await p.click('[data-more=rowTips]'); await expect(p.locator('#count')).toHaveText('แสดง 74 / 1260 ใบ')
  await expect(p.locator('#cards .crumbs')).toContainText('ดูทั้งหมด')
  expect(errs).toEqual([])
  await ctx.close()
})

test('all cards (virtual): < 6000 DOM nodes at 2560 · scrolled to the end shows the last card', async ({ browser }) => {
  const { ctx, p, errs } = await open(browser, D, 1)
  const dom = await p.evaluate(() => document.getElementsByTagName('*').length)
  expect(dom).toBeLessThan(6000)
  const last = [...CARDS].sort((a, b) => FO.indexOf(a.f) - FO.indexOf(b.f) || b.v - a.v || a.n.localeCompare(b.n)).at(-1)!
  for (let i = 0; i < 6; i++) { await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(250) }
  await expect(p.locator(`#grid .gc[data-id="${last.id}"]`)).toBeInViewport()
  expect(await p.evaluate(() => document.getElementsByTagName('*').length)).toBeLessThan(6000)
  expect(errs).toEqual([])
  await ctx.close()
})

test('phone: faction tiles in 2 columns · rows scroll sideways — mobile', async ({ browser }) => {
  const { ctx, p, errs } = await open(browser, { width: 390, height: 844 }, 2, { 'gwent-stars': '[112101,112102,112103,112104]' }, { home: true })
  const b = await p.locator('#ftiles .ftile').evaluateAll(e => e.slice(0, 3).map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)] }))
  expect(b[0][1]).toBe(b[1][1]); expect(b[1][0]).toBeGreaterThan(b[0][0]); expect(b[2][1]).toBeGreaterThan(b[0][1])
  const r = await p.locator('#rowTips .hrow').evaluate(e => [e.scrollWidth, e.clientWidth]); expect(r[0]).toBeGreaterThan(r[1])
  await p.click('.bottomnav [data-tab=deck]'); await p.click('.bottomnav [data-tab=cards]'); await expect(p.locator('#ftiles')).toBeVisible()
  expect(errs).toEqual([])
  await ctx.close()
})

test('sidebar tooltip: hover "จัดเดค" shows the description after ~300 ms, hides on leave · collapsed · keyboard · EN', async ({ browser }) => {
  const { ctx, p, errs } = await open(browser, D, 1, undefined, { home: true })
  const deck = p.locator('.side [data-tab=deck]')
  expect(await deck.getAttribute('title')).toBeNull()
  await deck.hover(); await expect(p.locator('#sideTip')).toHaveCount(0)
  await expect(p.locator('#sideTip')).toContainText('เลือกฝ่าย leader แล้วใส่การ์ด พร้อมคำแนะนำและแผนคราฟต์')
  await expect(p.locator('#sideTip b')).toHaveText('จัดเดค')
  const tb = (await p.locator('#sideTip').boundingBox())!, sb = (await p.locator('.side').boundingBox())!
  expect(tb.x).toBeGreaterThan(sb.x + sb.width - 1)
  await p.mouse.move(1500, 700); await expect(p.locator('#sideTip')).toHaveCount(0)
  // collapsed to icons: still there
  await p.click('#collapse'); await p.mouse.move(1500, 700)
  await deck.hover(); await expect(p.locator('#sideTip')).toContainText('จัดเดค')
  await p.mouse.move(1500, 700); await p.click('#collapse'); await p.mouse.move(1500, 700)
  // keyboard focus · text follows the language
  await p.click('.side [data-lang=en]'); await p.mouse.move(1500, 700)
  await p.locator('.side [data-tab=coll]').focus(); await p.keyboard.press('Tab')
  await expect(p.locator('#sideTip b')).toHaveText('Starred')
  await p.click('.side [data-lang=th]')
  expect(errs).toEqual([])
  await ctx.close()
})
