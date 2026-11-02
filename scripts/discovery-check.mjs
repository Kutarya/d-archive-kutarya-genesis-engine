import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const url = process.env.GENESIS_TEST_URL || 'http://127.0.0.1:5173/'
await mkdir('reports', { recursive: true })
const result = { at: new Date().toISOString(), url, checks: [], layouts: [], errors: [], externalRequests: [], successful: false }
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true })
await context.addInitScript(() => {
  const Native = window.Worker
  window.__discoveryWorkers = []
  window.Worker = class extends Native { constructor(...args) { super(...args); window.__discoveryWorkers.push(this) } }
  window.__discoveryRequest = 740000
})
const page = await context.newPage()
page.on('pageerror', error => result.errors.push(error.message))
page.on('request', request => {
  if (!request.url().startsWith('blob:') && !['localhost', '127.0.0.1'].includes(new URL(request.url()).hostname)) result.externalRequests.push(request.url())
})
const check = name => { result.checks.push(name); console.log(name) }
async function state(command) {
  return page.evaluate(command => new Promise((resolve, reject) => {
    const worker = window.__discoveryWorkers.at(-1), requestId = ++window.__discoveryRequest
    const timeout = setTimeout(() => { worker.removeEventListener('message', listener); reject(new Error('Worker timeout')) }, 10000)
    const listener = event => { if (event.data.kind === 'state' && event.data.requestId === requestId) { clearTimeout(timeout); worker.removeEventListener('message', listener); resolve(event.data.state) } }
    worker.addEventListener('message', listener)
    if (command) worker.postMessage(command)
    worker.postMessage({ kind: 'export', requestId })
  }), command)
}
async function progress(expected) {
  await page.waitForFunction(value => document.querySelector('[data-testid="discovery-progress"]')?.textContent === value, expected)
}
async function centerTap(touch = false) {
  await page.locator('.world-canvas').scrollIntoViewIfNeeded()
  const box = await page.locator('.world-canvas').boundingBox()
  if (touch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}
async function viewport() {
  return page.getByTestId('map-viewport').evaluate(el => Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Number(el.getAttribute(key))])))
}
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.world-canvas canvas')
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="population"]')?.textContent) > 0)
  await page.getByRole('button', { name: 'Akışı duraklat', exact: true }).click()
  const initial = await state(), initialBox = await page.locator('.world-canvas').boundingBox()
  assert(initialBox.y < 500, `Garden starts too low: ${initialBox.y}`)
  assert.equal(await page.locator('.camera-controls > span').textContent(), '200%')
  await progress('0/3')
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: 'reports/discovery-desktop-1.4.png', fullPage: true })
  check('Bahçe ilk ekranda; canlılar başlangıçta 200% yakın görünümde')

  await page.getByRole('button', { name: 'Bir dosta yaklaş', exact: true }).click()
  await page.locator('.little-friend').waitFor()
  await progress('1/3')
  const friendText = await page.locator('.little-friend').textContent()
  assert(initial.organisms.some(o => friendText.includes(`Minik #${o.id}`)))
  assert.equal(await page.locator('.camera-controls > span').textContent(), '260%')
  assert.deepEqual(await state(), initial)
  const firstText = await page.locator('.little-friend > div:nth-child(2) strong').textContent()
  await page.getByRole('button', { name: 'Bahçede bir dost bul', exact: true }).click()
  await page.waitForFunction(old => document.querySelector('.little-friend > div:nth-child(2) strong')?.textContent !== old, firstText)
  assert.deepEqual(await state(), initial)
  const friendCard = await page.locator('.little-friend').boundingBox()
  assert(friendCard.y < 650)
  check('Dost bul yaşayan farklı bir canlıyı seçip takip ediyor; DNA/RNG/zaman değişmiyor, kart görünür')

  await page.getByRole('button', { name: 'Tüm bahçeyi gör', exact: true }).click()
  await page.waitForTimeout(350)
  const fitted = await viewport()
  assert(Math.abs(fitted.x + fitted.width / 2 - initial.config.width / 2) < 1)
  assert(Math.abs(fitted.y + fitted.height / 2 - initial.config.height / 2) < 1)
  assert.deepEqual(await state(), initial)
  check('Tüm bahçe kamerayı merkezliyor ve önceki canlı takibi kamerayı geri çekmiyor')

  await page.getByTestId('discovery-feed').click()
  await page.waitForFunction(() => document.querySelector('.world-tools').getBoundingClientRect().top >= 0)
  await progress('1/3')
  await centerTap()
  const fed = await state()
  assert.equal(fed.food.length, initial.food.length + 12)
  await progress('2/3')
  await page.locator('.garden-action-feedback').waitFor()
  assert.match(await page.locator('.garden-action-feedback').textContent(), /12 besin/)
  await page.waitForFunction(() => !document.querySelector('.garden-action-feedback'))
  check('Araç seçmek adımı tamamlamıyor; gerçek 12 besin eklenince ilerleme ve geçici bildirim var')

  await page.getByTestId('discovery-add').click()
  await progress('2/3')
  await centerTap()
  const added = await state()
  assert.equal(added.organisms.length, fed.organisms.length + 1)
  assert.equal(added.totals.births, fed.totals.births)
  await progress('3/3')
  await page.locator('.world-panel').screenshot({ path: 'reports/discovery-complete-1.4.png' })
  check('Gerçek dost eklemesi üç keşfi tamamlıyor; doğum sayısı yapay olarak artmıyor')

  let full = added
  while (full.food.length < full.config.foodCapacity) full = await state({ kind: 'place', tool: 'food', x: full.config.width / 2, y: full.config.height / 2, radius: 32 })
  await state({ kind: 'load', requestId: 840000, state: full })
  await progress('0/3')
  assert.equal(await page.locator('.garden-action-feedback').count(), 0)
  await page.getByRole('button', { name: 'Dünya aracı: Besin fırçası', exact: true }).click()
  await centerTap()
  assert.deepEqual(await state(), full)
  await progress('0/3')
  assert.match(await page.locator('.garden-action-feedback').textContent(), /kapasitesi dolu/)
  check('Yükleme keşifleri/bildirimi temizliyor; dolu besin kapasitesinde sahte ilerleme yok')

  await state({ kind: 'init', config: initial.config }); await state({ kind: 'run', running: false })
  await progress('0/3')
  assert.equal(await page.locator('.little-friend').count(), 0)
  assert.equal(await page.locator('.garden-action-feedback').count(), 0)
  assert.equal(await page.locator('.camera-controls > span').textContent(), '200%')
  check('Yeni dünya seçimi, keşifleri, bildirimi ve yakın kamerayı doğru sıfırlıyor')

  for (const width of [320, 360, 390, 600, 700, 768, 900, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => scrollTo(0, 0))
    await page.waitForTimeout(130)
    const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, worldTop: document.querySelector('.world-canvas').getBoundingClientRect().top, tools: [...document.querySelectorAll('.tool-palette button')].map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })) }))
    assert(layout.scrollWidth <= width, `Overflow: ${JSON.stringify(layout)}`)
    assert(layout.worldTop < (width <= 700 ? 650 : 600), `World hidden: ${JSON.stringify(layout)}`)
    assert(layout.tools.every(t => t.width >= 44 && t.height >= 44))
    result.layouts.push(layout)
    if (width === 390) await page.screenshot({ path: 'reports/discovery-mobile-1.4.png', fullPage: true })
  }
  check('320–1440px dokuz genişlikte taşma yok; bahçe erişilebilir, dört ana araç en az 44×44px')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Bahçede bir dost bul', exact: true }).click()
  await page.locator('.garden-peek').waitFor()
  await progress('1/3')
  await page.getByRole('button', { name: 'Dünya aracı: Besin fırçası', exact: true }).click()
  const mobileBefore = await state(); await centerTap(true)
  assert.equal((await state()).food.length, mobileBefore.food.length + 12)
  await progress('2/3')
  await page.locator('.world-panel').screenshot({ path: 'reports/discovery-touch-1.4.png' })
  check('Mobilde dost bul anında kart açıyor; tek dokunuş gerçek besin ekleyip keşfi ilerletiyor')

  const speedBefore = await page.getByRole('button', { name: 'Hızı sıradaki kademeye getir', exact: true }).textContent()
  const beforeSpeed = await state()
  await page.getByRole('button', { name: 'Hızı sıradaki kademeye getir', exact: true }).click()
  assert.notEqual(await page.getByRole('button', { name: 'Hızı sıradaki kademeye getir', exact: true }).textContent(), speedBefore)
  assert.deepEqual(await state(), beforeSpeed)
  check('Hız kontrolü mobilde görünür ve duraklatılmış dünyayı adımlatmıyor')

  await page.getByRole('button', { name: 'Odak görünümünü aç', exact: true }).click()
  const focusBox = await page.locator('.world-canvas').boundingBox()
  assert(focusBox.height > 400)
  assert.equal(await page.locator('.garden-intro').evaluate(el => el.inert), true)
  assert.equal(await page.locator('.garden-discovery').evaluate(el => el.inert), true)
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('.garden-intro').evaluate(el => el.inert), false)
  const beforeMotion = await state()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForFunction(() => document.querySelector('.genesis-app')?.getAttribute('data-motion') === 'reduced')
  assert.deepEqual(await state(), beforeMotion)
  check('Odak görünümü yeni alanları klavyeden ayırıyor; Escape ve sistem hareket azaltma çalışıyor')

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Laboratuvar görünümünü aç', exact: true }).click()
  await page.getByRole('button', { name: 'Dünya & performans', exact: true }).click()
  const beforeCanvas = await state()
  await page.getByRole('combobox', { name: 'Görsel kalite', exact: true }).selectOption('canvas')
  await page.waitForFunction(() => document.querySelector('.world-bottomline')?.textContent?.includes('Canvas 2D'))
  await page.getByRole('button', { name: 'Oyun bahçesini aç', exact: true }).click()
  await page.getByRole('button', { name: 'Bahçede bir dost bul', exact: true }).click()
  assert.deepEqual(await state(), beforeCanvas)
  await page.locator('.world-panel').screenshot({ path: 'reports/discovery-canvas-1.4.png' })
  check('Canvas 2D bahçesinde de gerçek dostlar, yakın keşif ve korunmuş dünya durumu var')

  assert.deepEqual(result.errors, []); assert.deepEqual(result.externalRequests, [])
  result.successful = true
} catch (error) {
  result.failure = error.stack
  await page.screenshot({ path: 'reports/discovery-failure-1.4.png', fullPage: true }).catch(() => {})
  throw error
} finally {
  await writeFile('reports/discovery-acceptance-1.4.json', JSON.stringify(result, null, 2))
  await context.close(); await browser.close()
}
