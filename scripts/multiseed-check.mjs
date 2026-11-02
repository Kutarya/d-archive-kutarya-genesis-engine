import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'
const url = process.env.GENESIS_TEST_URL || 'http://127.0.0.1:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: /^Laboratuvar/ }).click()
  await page.getByRole('textbox', { name: 'Deney tohumları', exact: true }).fill('aynı\naynı')
  await page.getByRole('button', { name: 'Deneyi başlat', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'farklı tohumlar' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Deneyi iptal et', exact: true }).count(), 0)
  await page.getByRole('textbox', { name: 'Deney tohumları', exact: true }).fill('multi-a\nmulti-b\nmulti-c')
  await page.getByRole('spinbutton', { name: 'Seçilim süresi', exact: true }).fill('1')
  await page.getByRole('spinbutton', { name: 'Test süresi', exact: true }).fill('1')
  await page.getByRole('button', { name: 'Deneyi başlat', exact: true }).click()
  await page.getByTestId('survival-delta').waitFor({ timeout: 30000 })
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Deney raporunu indir', exact: true }).click()])
  await download.saveAs('reports/multiseed-browser-1.4.json')
  const report = JSON.parse(await readFile('reports/multiseed-browser-1.4.json', 'utf8'))
  assert.deepEqual(report.options.seeds, ['multi-a', 'multi-b', 'multi-c'])
  assert.deepEqual(report.experiments.map(e => e.seed), report.options.seeds)
  assert.equal(report.experiments.flatMap(e => e.comparisons).length, 6)
  assert.equal(await page.locator('.experiment-table tbody tr').count(), 6)
  assert.equal(await page.locator('.experiment-table tbody tr small').count(), 6)
  assert(report.experiments.every(e => !e.selectionPossible && e.births === 0))
  assert.equal(report.runtime.fixedStepSeconds, 1 / 60)
  assert.match(report.runtime.userAgent, /Edg/)
  assert.deepEqual(errors, [])
  const result = { at: new Date().toISOString(), url, duplicateSeedsRejected: true, threeRealWorkersRunsCompleted: true, sixPairedTestsShown: true, noReproductionCorrectlyLabeled: true, errors, successful: true }
  await writeFile('reports/multiseed-acceptance-1.4.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result))
} finally { await browser.close() }
