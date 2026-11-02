import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { World } from '../src/engine/world.ts'
import { historyCSV } from '../src/engine/csv.ts'
import { validateState } from '../src/engine/validation.ts'
const url = process.env.GENESIS_TEST_URL || 'http://127.0.0.1:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
const page = await context.newPage()
const result = { at: new Date().toISOString(), url, checks: [], errors: [], externalRequests: [], successful: false }
page.on('pageerror', error => result.errors.push(error.message))
page.on('request', request => { if (!['127.0.0.1', 'localhost'].includes(new URL(request.url()).hostname) && !request.url().startsWith('blob:')) result.externalRequests.push(request.url()) })
const check = name => { result.checks.push(name); console.log(name) }
function sameNumericState(actual, expected, path = 'state') {
  if (typeof actual === 'number' && typeof expected === 'number') {
    if (Number.isInteger(actual) && Number.isInteger(expected)) assert.equal(actual, expected, path)
    else assert(Math.abs(actual - expected) <= 1e-9, `${path}: ${actual} / ${expected}`)
    return
  }
  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    assert.deepEqual(Object.keys(actual), Object.keys(expected), path)
    for (const key of Object.keys(expected)) sameNumericState(actual[key], expected[key], `${path}.${key}`)
  } else assert.equal(actual, expected, path)
}
async function download(button, filename) {
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: button, exact: true }).click()])
  assert.equal(await file.failure(), null)
  const path = resolve('reports', filename); await file.saveAs(path)
  return readFile(path, 'utf8')
}
async function state() { const value = JSON.parse(await download('JSON dışa aktar', 'research-qa-1.4.json')); validateState(value); return value }
try {
  await mkdir('reports', { recursive: true })
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: /^Laboratuvar/ }).click()
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="population"]')?.textContent?.replaceAll('.', '')) > 0)
  await page.getByRole('button', { name: 'Simülasyonu duraklat', exact: true }).click()
  const legacy = JSON.parse(await readFile('reports/1.0/saved-world.json', 'utf8'))
  await page.locator('input[type=file]').setInputFiles(resolve('reports/1.0/saved-world.json'))
  await page.getByRole('status').filter({ hasText: 'Evren yüklendi' }).waitFor()
  assert.deepEqual(await state(), legacy); check('1.0 kayıt dosyası DNA/RNG/zaman bütünlüğüyle yükleniyor')
  const expected = World.fromState(legacy)
  await page.getByRole('button', { name: 'Bir sabit adım ilerlet', exact: true }).click(); expected.step()
  sameNumericState(await state(), JSON.parse(JSON.stringify(expected.exportState()))); check('Tek adım tam bir tick ve doğru motor durumu üretiyor (Node/Edge float toleransı 1e-9)')
  await page.getByRole('button', { name: 'Bir simülasyon saniyesi ilerlet', exact: true }).click(); expected.step(Math.round(1 / expected.config.stepSeconds))
  sameNumericState(await state(), JSON.parse(JSON.stringify(expected.exportState()))); check('Bir saniye ilerleme sabit adım sayısını doğru kullanıyor')
  await page.locator('.world-canvas').focus(); await page.keyboard.press('ArrowRight'); expected.step()
  sameNumericState(await state(), JSON.parse(JSON.stringify(expected.exportState())))
  await page.getByRole('textbox', { name: 'Rastgelelik tohumu', exact: true }).focus(); await page.keyboard.press('ArrowRight')
  assert.equal((await state()).tick, expected.tick); check('Klavye adımı çalışıyor; metin alanında motoru ilerletmiyor')

  const saved = await state()
  await page.getByRole('combobox', { name: 'Gen dağılımı özelliği', exact: true }).selectOption('senseRadius')
  const titleCounts = await page.locator('.trait-histogram rect title').allTextContents()
  assert.equal(titleCounts.reduce((sum, title) => sum + Number(title.match(/: (\d+) canlı/)[1]), 0), saved.organisms.length)
  const meanSense = saved.organisms.reduce((sum, o) => sum + o.dna.senseRadius, 0) / saved.organisms.length
  assert.equal(await page.getByTestId('trait-mean').textContent(), meanSense.toLocaleString('tr-TR', { maximumFractionDigits: 2 }))
  check('Gen dağılımı ve ortalama gerçek dışa aktarılmış DNA ile eşleşiyor')
  const csv = await download('İstatistik CSV indir', 'research-history-1.1.csv')
  assert.equal(csv.replace(/^\uFEFF/, ''), historyCSV(saved.history)); check('CSV dışa aktarma bütün gerçek geçmiş örneklerini koruyor')

  await page.getByRole('textbox', { name: 'Deney tohumları', exact: true }).fill('genesis-a')
  await page.getByRole('button', { name: 'Deneyi başlat', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('[data-testid="experiment-progress"]')?.value > 0)
  assert.equal(await page.getByRole('spinbutton', { name: 'Seçilim süresi', exact: true }).isDisabled(), true)
  await page.getByRole('button', { name: 'Deneyi iptal et', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Deney iptal edildi' }).waitFor()
  assert.equal(await page.locator('.experiment-table').count(), 0)
  assert.deepEqual(await state(), saved); check('Gerçek ilerleme ve iptal çalışıyor; kısmi deney sonuç gibi gösterilmiyor')

  await page.getByRole('button', { name: 'Deneyi başlat', exact: true }).click()
  await page.getByTestId('survival-delta').waitFor({ timeout: 180000 })
  const report = JSON.parse(await download('Deney raporunu indir', 'research-browser-experiment-1.4.json'))
  assert.equal(report.modelVersion, '1.1.0')
  assert.equal(report.experiments.length, 1)
  assert.equal(report.experiments[0].seed, 'genesis-a')
  assert.equal(report.experiments[0].comparisons.length, 2)
  assert.equal(report.statisticalSignificanceClaimed, false)
  for (const pair of report.experiments[0].comparisons) {
    assert.equal(pair.survivalDelta, pair.selected.survivalSeconds - pair.baseline.survivalSeconds)
    assert.equal(pair.foodDelta, pair.selected.foodPerFounder - pair.baseline.foodPerFounder)
    assert(pair.baseline.surviving <= 40 && pair.selected.surviving <= 40)
    assert(pair.baseline.survivalSeconds <= 60.00001 && pair.selected.survivalSeconds <= 60.00001)
  }
  assert.equal(await page.locator('.experiment-table tbody tr').count(), 2)
  for (let i = 0; i < report.experiments[0].comparisons.length; i++) {
    const pair = report.experiments[0].comparisons[i], cells = page.locator('.experiment-table tbody tr').nth(i).locator('td')
    assert.equal(await cells.nth(3).getAttribute('class'), pair.survivalDelta >= 0 ? 'positive' : 'negative')
    assert.equal(await cells.nth(4).getAttribute('class'), pair.foodDelta >= 0 ? 'positive' : 'negative')
  }
  check('Browser Worker gerçek eşlenmiş ölçümleri raporluyor; işaret ve renk sonuçla eşleşiyor')
  await page.getByRole('button', { name: 'Deneyi başlat', exact: true }).click()
  await page.getByTestId('survival-delta').waitFor({ timeout: 180000 })
  const repeated = JSON.parse(await download('Deney raporunu indir', 'research-browser-repeat-1.4.json'))
  assert.deepEqual(repeated.experiments, report.experiments)
  assert.equal(repeated.meanSurvivalDelta, report.meanSurvivalDelta)
  assert.equal(repeated.meanFoodDelta, report.meanFoodDelta)
  check('Aynı Edge ortamı ve tohum yeni Worker ile aynı tam deney sonucunu üretiyor')
  assert.deepEqual(await state(), saved); check('Tam deney boyunca açık evrenin RNG/DNA/enerji/zamanı değişmiyor')
  await page.locator('.research-lab').screenshot({ path: 'reports/research-desktop-1.4.png' })

  await page.getByRole('combobox', { name: 'Çevre senaryosu', exact: true }).selectOption('scarcity')
  assert.deepEqual(await state(), saved)
  await page.getByRole('button', { name: 'Yeni evren oluştur', exact: true }).click()
  await page.getByRole('button', { name: 'Simülasyonu duraklat', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Simülasyonu duraklat', exact: true }).click()
  const scenario = await state()
  assert.equal(scenario.config.temperature, 32); assert.equal(scenario.config.foodCapacity, 350); assert.equal(scenario.config.foodRate, 6)
  check('Senaryo seçimi mevcut evreni değiştirmiyor; Yeni evren ile gerçek koşullar uygulanıyor')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.research-lab').scrollIntoViewIfNeeded()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  assert.equal(await page.getByRole('button', { name: 'Deneyi başlat', exact: true }).isVisible(), true)
  await page.locator('.research-lab').screenshot({ path: 'reports/research-mobile-1.4.png' })
  check('390px araştırma kontrolleri kullanılabilir; sonuç tablosu kendi içinde kayıyor')
  assert.deepEqual(result.errors, []); assert.deepEqual(result.externalRequests, [])
  result.successful = true; result.experiment = { elapsedSeconds: report.elapsedSeconds, survivalDelta: report.meanSurvivalDelta, foodDelta: report.meanFoodDelta }
  console.log(JSON.stringify({ successful: true, checks: result.checks.length, experiment: result.experiment }))
} catch (error) { result.failure = error.message.slice(0, 800); await page.screenshot({ path: 'reports/research-failure-1.4.png', fullPage: true }).catch(() => {}); throw new Error(result.failure) }
finally { await writeFile('reports/research-acceptance-1.4.json', JSON.stringify(result, null, 2)); await context.close(); await browser.close() }
