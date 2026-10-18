// Screenshots of the built single file → screenshots/v3/. Run: npm run shots (skipped in npm run e2e)
import { test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { FILE } from './helpers'

const OUT = (n: string) => fileURLToPath(new URL(`../../screenshots/v3/${n}.png`, import.meta.url))

test('screenshots 2560x1440 + 390', async ({ browser }) => {
  test.skip(!process.env.SHOTS, 'set SHOTS=1 (npm run shots)')
  test.setTimeout(180_000)
  const ctx = await browser.newContext({ viewport: { width: 2560, height: 1440 } })
  const p = await ctx.newPage(); p.on('dialog', d => d.accept())
  await p.goto('file://' + FILE); await p.waitForSelector('#home .ftile')
  // open 3 cards so the "ดูล่าสุด" row is filled
  for (const q of ['geralt of rivia', 'yennefer of vengerberg', 'eredin bréacc glas']) { await p.fill('#hq', q); await p.waitForTimeout(400); await p.locator('#hres .gc .name').first().click(); await p.waitForTimeout(300); await p.click('#mClose') }
  await p.fill('#hq', ''); await p.waitForTimeout(3000)
  await p.screenshot({ path: OUT('g-home-2560') })
  await p.fill('#hq', 'bleeding'); await p.waitForTimeout(3000)
  await p.screenshot({ path: OUT('h-search-bleeding-2560') })
  await p.fill('#hq', ''); await p.click('#ftiles [data-fac=Monster]'); await p.waitForTimeout(3000)
  await p.screenshot({ path: OUT('i-faction-monsters-2560') })
  await p.click('#facBack'); await p.click('#homeAll'); await p.waitForSelector('#grid article')
  await p.click('#fFac [data-k=Monster]'); await p.click('#fFac [data-k=Neutral]'); await p.waitForTimeout(3000)
  await p.screenshot({ path: OUT('a-cards-2560') })
  await p.click('#reset'); await p.fill('#q', 'eredin bréacc glas'); await p.waitForTimeout(400)
  await p.locator('#grid .gc .name').first().click(); await p.waitForTimeout(2500)
  await p.screenshot({ path: OUT('b-modal-2560') })
  await p.click('#mClose'); await p.click('#reset')
  await p.click('.side [data-tab=deck]'); await p.selectOption('#dFac', 'Monster'); await p.selectOption('#dLead', '200055')
  for (const q of ['eredin bréacc glas', 'caranthir', 'imlerith', 'wild hunt rider', 'wild hunt hound', 'nekker warrior', 'foglet', 'red riders']) {
    await p.fill('#pQ', q); await p.waitForTimeout(400); const t = p.locator('#dPick .gc:not(.blk) [data-act=add]').first(); if (await t.count()) await t.click()
  }
  await p.fill('#pQ', ''); await p.fill('#dScr', '1000'); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(3000)
  await p.screenshot({ path: OUT('c-deck-2560') })
  await p.click('.side [data-tab=ov]'); await p.waitForTimeout(800)
  await p.screenshot({ path: OUT('d-factions-2560') })
  await ctx.close()
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage()
  await m.goto('file://' + FILE); await m.waitForSelector('#home .ftile'); await m.waitForTimeout(2500)
  await m.screenshot({ path: OUT('j-home-mobile-390') })
  await m.click('#homeAll'); await m.waitForSelector('#grid article'); await m.waitForTimeout(2500)
  await m.screenshot({ path: OUT('e-mobile-390') })
  await m.click('#ftoggle'); await m.waitForTimeout(500)
  await m.screenshot({ path: OUT('f-mobile-sheet-390') })
})
