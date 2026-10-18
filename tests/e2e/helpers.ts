// Shared helpers for the behaviour e2e (tests/e2e/app.spec.ts). Selectors use ids / data-* / roles, not layout.
import type { Browser, Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

export const FILE = fileURLToPath(new URL('../../dist-single/GWENT-Thai-wiki.html', import.meta.url))
export const VPS = [['desktop', { width: 2560, height: 1440 }, 1], ['mobile', { width: 390, height: 844 }, 2]] as const
export const sp = (s: string | null) => (s || '').replace(/\s+/g, ' ').trim()

/** localStorage exactly as the old single-file page wrote it (keys + formats must keep working) */
export const SEED: Record<string, string> = {
  'gwent-lang': 'en',
  'gwent-own': '{"112405":2,"131102":1}',
  'gwent-stars': '[112405,131102]',
  'gwent-scraps': '640',
  'gwent-deck': '{"f":"Monster","L":131101,"c":{"112405":2,"131102":1,"132211":1}}',
}

export async function open(browser: Browser, vp: { width: number; height: number }, dsf: number, seed?: Record<string, string>, opts: { acceptDownloads?: boolean; home?: boolean } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dsf, acceptDownloads: opts.acceptDownloads })
  if (seed) await ctx.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { for (const k in s) localStorage.setItem(k, s[k]); sessionStorage.setItem('seeded', '1') } }, seed)
  const p = await ctx.newPage(); const errs: string[] = []
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('pageerror', e => errs.push('pageerror: ' + e.message))
  p.on('dialog', d => d.accept())
  await p.goto('file://' + FILE); await p.waitForSelector('#home .ftile')
  // the app opens on the cards home; most tests start from the all-cards grid (home: true = stay on the home)
  if (!opts.home) await toAll(p)
  await p.waitForTimeout(500)
  return { ctx, p, errs }
}

/** cards home → "ดูการ์ดทั้งหมด" grid with the filter panel */
export async function toAll(p: Page) { await p.click('#homeAll'); await p.waitForSelector('#grid article') }

export const mobile = (p: Page) => p.viewportSize()!.width <= 760
/** go to a page with the sidebar (desktop) or the bottom bar (phone) */
export async function nav(p: Page, t: 'cards' | 'deck' | 'coll' | 'stars' | 'ov' | 'guide') { await p.click(`${mobile(p) ? '.bottomnav' : '.side'} [data-tab=${t}]`); await p.waitForTimeout(250) }
/** sidebar "การ์ด" (opens the home) → all-cards grid */
export async function navAll(p: Page) { await nav(p, 'cards'); await toAll(p); await p.waitForTimeout(150) }
/** filter panel: docked on desktop (open by default), bottom sheet on the phone */
export async function openF(p: Page) { if (!(await p.isVisible('#fpanel'))) await p.click('#ftoggle'); await p.waitForTimeout(150) }
export async function closeF(p: Page) { if (mobile(p) && await p.isVisible('#fpanel')) await p.click('#sheetDone'); await p.waitForTimeout(150) }
export const count = (p: Page) => p.textContent('#count')
/** deck page on the phone shows either the picker or the deck */
export async function deckView(p: Page, v: 'pick' | 'deck') { if (mobile(p)) { await p.click(v === 'pick' ? '#dsPick' : '#dsDeck'); await p.waitForTimeout(150) } }

/** the nth card of the virtual #grid (only rows on screen exist): scroll until its row is rendered, then return it */
export async function gridNth(p: Page, n: number) {
  const [r, k] = await p.evaluate(async n => {
    const g = document.querySelector('#grid')!; const first = g.querySelector<HTMLElement>('.vrow')!
    const cols = getComputedStyle(first).gridTemplateColumns.split(' ').length; const r = Math.floor(n / cols)
    for (let i = 0; i < 80 && !g.querySelector(`.vrow[data-index="${r}"]`); i++) {
      const max = Math.max(...[...g.querySelectorAll<HTMLElement>('.vrow')].map(x => +x.dataset.index!))
      scrollBy(0, (r > max ? 1 : -1) * innerHeight * 0.8); await new Promise(f => setTimeout(f, 60))
    }
    g.querySelector(`.vrow[data-index="${r}"]`)!.scrollIntoView({ block: 'center' }); await new Promise(f => setTimeout(f, 120))
    return [r, n % cols]
  }, n)
  return p.locator(`#grid .vrow[data-index="${r}"] > .gc`).nth(k)
}
