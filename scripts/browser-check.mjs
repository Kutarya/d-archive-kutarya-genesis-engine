import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { validateState } from '../src/engine/validation.ts'
const url = process.env.GENESIS_TEST_URL || 'http://127.0.0.1:5173/'
await mkdir('reports', { recursive: true })
const result = { at: new Date().toISOString(), url, checks: [], errors: [], externalRequests: [] }
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, hasTouch: true })
const page = await context.newPage()
page.on('pageerror', error => result.errors.push(error.message))
page.on('request', request => { if (!['127.0.0.1', 'localhost'].includes(new URL(request.url()).hostname) && !request.url().startsWith('blob:')) result.externalRequests.push(request.url()) })
const check = name => { result.checks.push(name); console.log(name) }
async function exported(name = 'qa-world.json') {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'JSON dışa aktar', exact: true }).click()])
  assert.equal(await download.failure(), null)
  const path = resolve('reports', name); await download.saveAs(path)
  const state = JSON.parse(await readFile(path, 'utf8')); validateState(state)
  return state
}
async function centerClick() { const box = await page.locator('.world-canvas').boundingBox(); assert(box); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2) }
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: /^Laboratuvar/ }).click()
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="population"]')?.textContent?.replaceAll('.', '')) > 0)
  await page.waitForSelector('.world-canvas canvas')
  await page.getByRole('button', { name: 'Simülasyonu duraklat', exact: true }).click()
  await page.getByRole('button', { name: 'Simülasyona devam et', exact: true }).waitFor()
  const initial = await exported()
  await page.waitForTimeout(1200)
  assert.equal((await exported()).tick, initial.tick); check('Worker duraklatma adımları durduruyor')
  assert(initial.organisms.length > 0); check('Gerçek çalışan dünya JSON ile dışa aktarılıyor')

  await page.getByRole('button', { name: 'Dünyayı ekrana sığdır', exact: true }).click()
  const box = await page.locator('.world-canvas').boundingBox(); assert(box)
  const dimensions = await page.locator('.world-canvas').evaluate(el => ({ width: el.clientWidth, height: el.clientHeight }))
  const scale = Math.max(.08, Math.min(3, Math.min((dimensions.width - 44) / initial.config.width, (dimensions.height - 44) / initial.config.height)))
  const specimen = initial.organisms.find(o => Math.abs(o.x - initial.config.width / 2) < initial.config.width * .3 && Math.abs(o.y - initial.config.height / 2) < initial.config.height * .3)
  assert(specimen)
  await page.mouse.click(box.x + dimensions.width / 2 + (specimen.x - initial.config.width / 2) * scale, box.y + dimensions.height / 2 + (specimen.y - initial.config.height / 2) * scale)
  await page.getByRole('heading', { name: `G-${String(specimen.id).padStart(4, '0')}`, exact: true }).waitFor()
  await page.getByRole('button', { name: 'Sinir ağı', exact: true }).click()
  assert.equal(await page.locator('.brain-view > svg circle').count(), 27)
  assert.equal(await page.locator('.brain-view > svg line').count(), 180)
  assert.match(await page.locator('.brain-view > svg line').first().textContent(), new RegExp(specimen.dna.weights[0].toFixed(4).replace('.', '\\.')))
  assert((await page.locator('.brain-view > svg circle').nth(12).textContent()).includes(specimen.hidden[0].toFixed(4)))
  check('Seçim ve beyin gerçek DNA ağırlık/aktivasyonlarını gösteriyor')
  await page.getByRole('button', { name: 'Canlıyı takip et', exact: true }).click()
  await page.getByRole('button', { name: 'Takibi durdur', exact: true }).waitFor(); await page.getByRole('button', { name: 'Takibi durdur', exact: true }).click()
  const zoomBefore = await page.locator('.camera-controls>span').textContent()
  await page.getByRole('button', { name: 'Yakınlaştır', exact: true }).click(); assert.notEqual(await page.locator('.camera-controls>span').textContent(), zoomBefore)
  await page.getByRole('button', { name: 'Dünyayı ekrana sığdır', exact: true }).click()
  await page.screenshot({ path: 'reports/brain-1.4.png', fullPage: true }); check('Takip, zoom ve seçili beyin görünümü çalışıyor')

  await page.getByRole('button', { name: 'Besin ekle', exact: true }).click(); await centerClick()
  const fed = await exported(); assert.equal(fed.food.length, Math.min(fed.config.foodCapacity, initial.food.length + 12))
  await page.getByRole('button', { name: 'Canlı ekle', exact: true }).click(); await centerClick()
  const added = await exported(); assert.equal(added.organisms.length, initial.organisms.length + 1)
  await page.getByRole('button', { name: 'Tehlikeli bölge', exact: true }).click(); await centerClick()
  const hazard = await exported(); assert.equal(hazard.hazards.length, initial.hazards.length + 1)
  await page.getByRole('button', { name: 'Tehlikeli bölge', exact: true }).click(); check('Dünya besin/canlı/tehlike müdahaleleri uygulanıyor')

  await page.getByRole('button', { name: 'Evreni kaydet', exact: true }).click()
  await page.getByRole('textbox', { name: 'Kayıt adı', exact: true }).fill('Tarayıcı kabul evreni')
  await page.getByRole('button', { name: 'Yerel kaydı oluştur', exact: true }).click()
  await page.waitForFunction(() => !document.querySelector('dialog')?.open)
  const savedState = await exported('saved-world.json')
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: /^Laboratuvar/ }).click()
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="population"]')?.textContent?.replaceAll('.', '')) > 0)
  await page.getByRole('button', { name: 'Yerel kayıtlar', exact: true }).click()
  await page.getByText('Tarayıcı kabul evreni', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Yükle', exact: true }).click()
  await page.getByRole('button', { name: 'Simülasyona devam et', exact: true }).waitFor()
  assert.deepEqual(await exported('restored-world.json'), savedState); check('IndexedDB yenileme sonrası tam dünya/RNG/DNA durumunu koruyor')

  await writeFile('reports/invalid-world.json', '{"schemaVersion":9}')
  await page.locator('input[type=file]').setInputFiles(resolve('reports/invalid-world.json'))
  await page.getByRole('status').filter({ hasText: 'desteklenmiyor' }).waitFor()
  assert.deepEqual(await exported(), savedState); check('Bozuk JSON reddediliyor ve mevcut dünya korunuyor')
  await page.locator('input[type=file]').setInputFiles(resolve('reports/saved-world.json'))
  await page.getByRole('status').filter({ hasText: 'Evren yüklendi' }).waitFor()
  assert.deepEqual(await exported(), savedState); check('JSON içe alma tam durumu geri yüklüyor')

  await page.getByRole('button', { name: 'Dünya & performans', exact: true }).click()
  await page.getByRole('combobox', { name: 'Görsel kalite', exact: true }).selectOption('canvas')
  await page.waitForFunction(() => document.querySelector('.world-bottomline')?.textContent?.includes('Canvas 2D'))
  assert.deepEqual(await exported(), savedState); check('Canvas 2D alternatifi motor durumunu değiştirmiyor')
  await page.screenshot({ path: 'reports/canvas-1.4.png', fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await page.getByRole('button', { name: 'Evren kontrolü', exact: true }).click()
  await page.getByRole('button', { name: 'Kontrol panelini kapat', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Kontrol panelini kapat', exact: true }).click()
  await page.getByRole('button', { name: /^Analiz/ }).click()
  await page.getByRole('button', { name: 'Analiz panelini kapat', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Analiz panelini kapat', exact: true }).click()
  await page.getByRole('button', { name: 'Yakınlaştır', exact: true }).click()
  await page.screenshot({ path: 'reports/mobile-1.4.png', fullPage: true }); check('390px mobil paneller ve zoom kullanılabilir; yatay taşma yok')
  assert.deepEqual(result.errors, []); assert.deepEqual(result.externalRequests, [])
  result.successful = true
  await writeFile('reports/browser-acceptance-1.4.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify({ successful: true, checks: result.checks.length, errors: result.errors.length, externalRequests: result.externalRequests.length }))
} catch (error) { await page.screenshot({ path: 'reports/browser-failure-1.4.png', fullPage: true }).catch(() => {}); console.log(JSON.stringify(result)); throw error } finally { await context.close(); await browser.close() }
