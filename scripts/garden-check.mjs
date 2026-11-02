import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const url = process.env.GENESIS_TEST_URL || 'http://127.0.0.1:5173/'
await mkdir('reports', { recursive: true })
const result = { at: new Date().toISOString(), url, checks: [], errors: [], externalRequests: [], layouts: [], successful: false }
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, hasTouch: true })
await context.addInitScript(() => {
  const Native = window.Worker
  window.__gardenWorkers = []
  window.Worker = class extends Native { constructor(...args) { super(...args); window.__gardenWorkers.push(this) } }
  window.__gardenRequest = 920000
})
const page = await context.newPage()
page.on('pageerror', error => result.errors.push(error.message))
page.on('request', request => { if (!request.url().startsWith('blob:') && !['127.0.0.1', 'localhost'].includes(new URL(request.url()).hostname)) result.externalRequests.push(request.url()) })
const check = name => { result.checks.push(name); console.log(name) }
async function state(command) {
  return page.evaluate(command => new Promise((resolve, reject) => {
    const w = window.__gardenWorkers.at(-1), requestId = ++window.__gardenRequest
    const timeout = setTimeout(() => { w.removeEventListener('message', listener); reject(new Error('Worker yanıt vermedi.')) }, 8000)
    const listener = e => { if (e.data.kind === 'state' && e.data.requestId === requestId) { clearTimeout(timeout); w.removeEventListener('message', listener); resolve(e.data.state) } }
    w.addEventListener('message', listener); if (command) w.postMessage(command); w.postMessage({ kind: 'export', requestId })
  }), command)
}
async function centerClick() { await page.locator('.world-canvas').scrollIntoViewIfNeeded(); const b = await page.locator('.world-canvas').boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) }
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.world-canvas canvas')
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="population"]')?.textContent) > 0)
  assert.equal(await page.locator('.genesis-app').getAttribute('class'), 'genesis-app garden-mode ')
  assert.equal(await page.getByRole('button', { name: /^Dünya aracı/ }).count(), 4)
  assert.equal(await page.locator('.control-panel').isVisible(), false)
  assert.equal(await page.locator('.research-lab').isVisible(), false)
  assert.equal(await page.locator('h1').textContent(), 'Yaşam Bahçesiküçük keşifler, büyük meraklar')
  check('İlk açılış sıcak temalı sade bahçe; dört büyük araç ve doğru Türkçe metinler')
  await page.getByRole('button', { name: 'Akışı duraklat', exact: true }).click()
  const initial = await state()
  await page.getByRole('button', { name: 'Laboratuvar görünümünü aç', exact: true }).click()
  assert.equal(await page.locator('.research-lab').isVisible(), true)
  assert.deepEqual(await state(), initial)
  await page.getByRole('button', { name: 'Oyun bahçesini aç', exact: true }).click()
  assert.deepEqual(await state(), initial)
  check('Bahçe / laboratuvar geçişi DNA, RNG, zaman ve dünyayı aynen koruyor')

  await page.getByRole('button', { name: 'Dünya aracı: Besin fırçası', exact: true }).click(); await centerClick()
  const fed = await state(); assert.equal(fed.food.length, Math.min(initial.config.foodCapacity, initial.food.length + 12)); assert.equal(fed.tick, initial.tick)
  await page.getByRole('button', { name: 'Dünya aracı: Canlı ekle', exact: true }).click(); await centerClick()
  const added = await state(); assert.equal(added.organisms.length, initial.organisms.length + 1)
  await page.locator('.little-friend').waitFor()
  assert((await page.locator('.little-friend').textContent()).includes(`Minik #${added.nextId - 1}`))
  const beforeInspect = await page.locator('.camera-controls>span').textContent()
  await page.getByRole('button', { name: 'Yakından izle', exact: true }).click()
  assert.notEqual(await page.locator('.camera-controls>span').textContent(), beforeInspect)
  assert.deepEqual(await state(), added)
  check('Büyük araçlar gerçek besin/canlı ekliyor; dost kartı ve yakın takip çalışıyor')

  await page.getByRole('button', { name: 'Hareketi azalt', exact: true }).click()
  assert.equal(await page.locator('.genesis-app').getAttribute('data-motion'), 'reduced')
  assert.equal(await page.locator('.garden-creature').first().evaluate(el => getComputedStyle(el).animationName), 'none')
  assert.deepEqual(await state(), added)
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.world-canvas canvas')
  assert.equal(await page.locator('.genesis-app').getAttribute('data-motion'), 'reduced')
  await page.getByRole('button', { name: 'Animasyonları aç', exact: true }).click()
  assert.notEqual(await page.locator('.garden-creature').first().evaluate(el => getComputedStyle(el).animationName), 'none')
  check('Hareket azaltma motoru değiştirmiyor ve yenilemede korunuyor')

  await page.getByRole('button', { name: 'Akışı duraklat', exact: true }).click()
  assert.equal(await page.locator('.garden-creature').first().evaluate(el => getComputedStyle(el).animationPlayState), 'paused')
  // Advance only through normal Worker steps: no DNA, energy, totals or births are fabricated.
  let evolved = await state()
  for (let i = 0; i < 45 && evolved.totals.births === 0; i++) evolved = await state({ kind: 'step', count: 120 })
  assert(evolved.totals.births > 0, 'Normal simülasyon adımları doğum üretmedi')
  await page.getByTestId('life-celebration').waitFor()
  assert.equal(Number(await page.getByTestId('garden-births').textContent()), evolved.totals.births)
  const generation = Math.max(0, ...evolved.organisms.map(o => o.generation))
  assert.equal(await page.getByTestId('garden-generation').textContent(), `${generation}.`)
  assert.match(await page.getByTestId('life-celebration').textContent(), /nesil|yavru/)
  assert.equal(await page.locator('.celebration-confetti i').count(), 14)
  await page.locator('.world-stage').screenshot({ path: 'reports/garden-birth-1.4.png' })
  check(`Gerçek doğum ve nesil değişimi gelişim yolunu, sayıları ve konfeti kutlamasını tetikliyor (${evolved.totals.births} doğum)`)
  await state({ kind: 'init', config: initial.config }); await state({ kind: 'run', running: false })
  await page.waitForFunction(() => document.querySelector('[data-testid="garden-births"]')?.textContent === '0')
  assert.equal(await page.getByTestId('life-celebration').count(), 0)
  assert.equal(await page.getByTestId('garden-generation').textContent(), '0.')
  check('Yeni dünya eski nesil/doğum kutlamasını ve yolculuğunu sıfırlıyor')

  for (const width of [320, 360, 390, 600, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await page.waitForTimeout(120)
    const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, tools: [...document.querySelectorAll('.tool-palette button')].map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })), background: getComputedStyle(document.documentElement).backgroundColor }))
    assert.equal(layout.scrollWidth > layout.width, false, `Taşma: ${JSON.stringify(layout)}`)
    assert(layout.tools.every(b => b.width >= 44 && b.height >= 44), `Küçük araç: ${JSON.stringify(layout)}`)
    result.layouts.push(layout)
    if ([390, 1440].includes(width)) { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `reports/garden-${width}-1.4.png`, fullPage: true }) }
  }
  check('320–1440px yedi ekran genişliğinde taşma yok; bütün ana araçlar en az 44×44px')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Dünya aracı: Besin fırçası', exact: true }).click()
  const mobileBefore = await state(); await page.locator('.world-canvas').scrollIntoViewIfNeeded()
  const b = await page.locator('.world-canvas').boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2)
  assert((await state()).food.length > mobileBefore.food.length)
  await page.getByRole('button', { name: 'Kullanım kılavuzu', exact: true }).click()
  await page.getByRole('dialog', { name: 'Dünya kullanım kılavuzu', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Kullanım kılavuzunu kapat', exact: true }).click()
  check('Mobil tek dokunuş gerçek besin ekliyor; rehber açılıp kapanıyor')

  await page.getByRole('button', { name: 'Dünya aracı: Canlı ekle', exact: true }).click()
  await page.locator('.world-canvas').scrollIntoViewIfNeeded()
  const friendBox = await page.locator('.world-canvas').boundingBox()
  await page.touchscreen.tap(friendBox.x + friendBox.width / 2, friendBox.y + friendBox.height / 2)
  await page.locator('.garden-peek').waitFor()
  const friendState = await state()
  assert((await page.locator('.garden-peek').textContent()).includes(`Minik #${friendState.nextId - 1}`))
  await page.getByRole('button', { name: 'Seçili dostu yakından izle', exact: true }).click()
  assert.deepEqual(await state(), friendState)
  await page.locator('.world-panel').screenshot({ path: 'reports/garden-friend-mobile-1.4.png' })
  await page.getByRole('button', { name: 'Seçili dost kartını kapat', exact: true }).click()
  assert.equal(await page.locator('.garden-peek').count(), 0)
  check('Mobilde seçilen gerçek dost anında görünür; yakın izle ve kapat çalışır')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForFunction(() => document.querySelector('.genesis-app')?.getAttribute('data-motion') === 'reduced')
  assert.equal(await page.locator('.garden-creature').first().evaluate(el => getComputedStyle(el).animationName), 'none')
  assert.equal(await page.getByRole('button', { name: 'Animasyonları aç', exact: true }).isDisabled(), true)
  check('Sistem hareket azaltma tercihi canlı olarak uygulanıyor')
  assert.deepEqual(result.errors, []); assert.deepEqual(result.externalRequests, [])
  result.successful = true
} catch (error) { result.failure = error.message; await page.screenshot({ path: 'reports/garden-failure-1.4.png', fullPage: true }).catch(() => {}); throw error }
finally { await writeFile('reports/garden-acceptance-1.4.json', JSON.stringify(result, null, 2)); await context.close(); await browser.close() }
