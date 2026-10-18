// Language switch: EN mode shows no Thai anywhere (all main pages, modal, deck with suggestions, About) at 2560 and 390,
// switching back to Thai brings the Thai UI back, and the choice survives a reload (localStorage gwent-lang).
import { expect, test, type Page } from '@playwright/test'
import { VPS, mobile, nav, open, openF, closeF, deckView, toAll } from './helpers'

const THAI = /[฀-๿]/
const SEED: Record<string, string> = {
  'gwent-lang': 'th',
  'gwent-own': '{"112405":2,"131102":1}',
  'gwent-stars': '[112405,131102,203200]',
  'gwent-recent': '[203200,112405]',
  'gwent-scraps': '640',
  'gwent-deck': '{"f":"Monster","L":131101,"c":{"112405":2,"131102":1,"132211":1}}',
}

/** visible text of the page (input values are not part of innerText) → the Thai pieces found, with a little context */
async function thaiIn(p: Page, where: string) {
  const t = await p.evaluate(() => document.body.innerText)
  const hits = [...t.matchAll(/.{0,30}[฀-๿]+.{0,30}/g)].map(m => m[0])
  return hits.map(h => `${where}: ${h}`)
}

for (const [name, vp, dsf] of VPS) {
  test(`EN mode: no Thai on any page, back to Thai, kept after reload — ${name}`, async ({ browser }) => {
    test.setTimeout(150_000)
    const { ctx, p, errs } = await open(browser, vp, dsf, SEED, { home: true })
    await p.locator('.lang button[data-lang=en]').filter({ visible: true }).first().click(); await p.waitForTimeout(300)
    expect(await p.evaluate(() => localStorage.getItem('gwent-lang'))).toBe('en')
    expect(await p.evaluate(() => document.documentElement.lang)).toBe('en')
    expect(await p.title()).not.toMatch(THAI)
    expect(await p.locator('meta[name=description]').getAttribute('content')).not.toMatch(THAI)
    const found: string[] = []
    const check = async (where: string) => { await p.waitForTimeout(200); found.push(...await thaiIn(p, where)) }

    await check('home')
    await expect(p.locator('#mtNote')).toContainText('machine-translated')
    await p.fill('#hq', 'bleeding'); await p.waitForTimeout(400); await check('home search')
    await p.fill('#hq', 'zzqqxx'); await p.waitForTimeout(400); await check('home no results')
    await p.fill('#hq', 'ทำดาเมจ'); await p.waitForTimeout(400) // Thai search still works in EN mode
    expect(Number(await p.textContent('#hresN'))).toBeGreaterThan(60)
    await p.fill('#hq', ''); await p.waitForTimeout(300)
    await p.click('#ftiles [data-fac=Monster]'); await p.waitForSelector('#facpage'); await check('faction')
    await p.click('#facBack')
    await toAll(p); await openF(p); await check('all cards + filters')
    await p.click('#fOwn [data-own=full]'); await p.click('#fTip'); await check('filter chips'); await closeF(p)

    // modal: card with keyword tips, its own tip, deck style and pairs
    await nav(p, 'stars'); await p.locator('#grid .gc[data-id="203200"]').click(); await p.waitForSelector('#mBody .m-title')
    await expect(p.locator('#mBody .tipbox').first()).toBeVisible(); await check('modal')
    const pair = p.locator('#mBody .prow .mini').first()
    if (await pair.count()) { await pair.click(); await p.waitForSelector('#mBack'); await check('modal history') }
    const kwb = p.locator('#mBody .kwb').first()
    if (await kwb.count()) { await kwb.click(); await expect(p.locator('#pop')).toBeVisible(); await check('keyword popover') }
    await p.keyboard.press('Escape'); await p.keyboard.press('Escape')

    await check('starred')
    await nav(p, 'coll'); await check('collection')
    await nav(p, 'deck'); await deckView(p, 'pick'); await check('deck: pick')
    await deckView(p, 'deck'); await expect(p.locator('#recList .rec-item').first()).toBeVisible(); await check('deck: deck + suggestions')
    await nav(p, 'ov'); await check('factions & decks')
    await nav(p, 'guide'); await expect(p.locator('#guide #g-deck')).toBeVisible(); await check('guide + what\'s new')
    await expect(p.locator('#whatsnew .news-item').first()).toContainText('Several decks')
    await nav(p, 'deck'); await deckView(p, 'deck')
    if (mobile(p)) await p.click('#deckMore')
    await p.click('#deckShare'); await expect(p.locator('#shareDlg')).toBeVisible(); await check('deck: share dialog'); await p.keyboard.press('Escape')
    if (mobile(p)) await p.click('#deckMore')
    await p.click('#deckRename'); await expect(p.locator('#renameDlg')).toBeVisible(); await check('deck: rename dialog'); await p.keyboard.press('Escape')
    await p.click('#aboutOpen'); await expect(p.locator('#aboutDlg')).toBeVisible(); await check('about')
    await expect(p.locator('#aboutDlg')).toContainText('This is an unofficial fan work and is not approved/endorsed by CD PROJEKT RED.')
    await p.keyboard.press('Escape')
    if (!mobile(p)) { await p.locator('.side [data-tab=deck]').hover(); await expect(p.locator('#sideTip')).toBeVisible(); await check('sidebar tooltip'); await p.mouse.move(1500, 700) }
    expect(found).toEqual([])

    // EN is kept after a reload
    await p.reload(); await p.waitForSelector('#home .ftile')
    expect(await p.evaluate(() => localStorage.getItem('gwent-lang'))).toBe('en'); found.length = 0; await check('home after reload'); expect(found).toEqual([])

    // back to Thai: Thai UI again, kept after a reload
    await p.locator('.lang button[data-lang=th]').filter({ visible: true }).first().click(); await p.waitForTimeout(300)
    await expect(p.locator('#siteHead')).toContainText('คลังการ์ด GWENT แฟนเมด')
    expect((await thaiIn(p, 'th')).length).toBeGreaterThan(5) // the detector does see Thai
    expect(await p.evaluate(() => document.documentElement.lang)).toBe('th')
    await p.reload(); await p.waitForSelector('#home .ftile')
    expect(await p.evaluate(() => localStorage.getItem('gwent-lang'))).toBe('th')
    await toAll(p); await expect(p.locator('#count')).toHaveText('แสดง 1260 / 1260 ใบ')
    await expect(p.locator('#siteFoot')).toContainText('เว็บนี้เป็นผลงานแฟนที่ไม่เป็นทางการ')
    await expect(p.locator('#siteFoot')).toContainText('This is an unofficial fan work and is not approved/endorsed by CD PROJEKT RED.')
    expect(errs).toEqual([])
    await ctx.close()
  })
}
