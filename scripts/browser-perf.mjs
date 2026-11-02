import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { writeFile, mkdir } from 'node:fs/promises'
const url = process.env.GENESIS_TEST_URL || 'http://127.0.0.1:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage(), errors = [], measurements = []
page.on('pageerror', error => errors.push(error.message))
async function range(label, value) {
  const input = page.getByRole('slider', { name: label, exact: true })
  const min = Number(await input.getAttribute('min')), step = Number(await input.getAttribute('step'))
  await input.focus(); await page.keyboard.press('Home')
  for (let i = 0; i < Math.round((value - min) / step); i++) await page.keyboard.press('ArrowRight')
  assert.equal(await input.inputValue(), String(value))
}
try {
  await mkdir('reports', { recursive: true })
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: /^Laboratuvar/ }).click()
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="population"]')?.textContent) > 0)
  await page.getByRole('button', { name: 'Dünya & performans', exact: true }).click()
  await range('Popülasyon kapasitesi', 1000)
  for (const population of [500, 1000]) {
    await range('Başlangıç canlı sayısı', population)
    await page.getByRole('textbox', { name: 'Rastgelelik tohumu', exact: true }).fill(`benchmark-${population}`)
    await page.getByRole('button', { name: 'Yeni evren oluştur', exact: true }).click()
    await page.waitForFunction(value => Number(document.querySelector('[data-testid="population"]')?.textContent?.replaceAll('.', '')) === value, population)
    await page.waitForTimeout(1600)
    const samples = []
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(1000)
      samples.push(await page.evaluate(() => {
        const number = id => Number.parseFloat(document.querySelector(`[data-testid="${id}"]`)?.textContent?.replaceAll('.', '').replace(',', '.') || '0')
        return { fps: number('fps'), stepsPerSecond: number('sps'), population: number('population') }
      }))
    }
    const mean = key => samples.reduce((s, value) => s + value[key], 0) / samples.length
    const record = { initialPopulation: population, actualPopulationMin: Math.min(...samples.map(s => s.population)), actualPopulationMax: Math.max(...samples.map(s => s.population)), fpsMean: mean('fps'), fpsMin: Math.min(...samples.map(s => s.fps)), stepsPerSecondMean: mean('stepsPerSecond'), samples, renderer: await page.locator('.world-bottomline').textContent(), viewport: { width: 1440, height: 1000 } }
    measurements.push(record); console.log(JSON.stringify(record))
    await page.screenshot({ path: `reports/performance-${population}-1.4.png`, fullPage: true })
  }
  const before = await page.getByTestId('sim-time').textContent()
  const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront()
  const backgroundState = await page.evaluate(() => document.visibilityState)
  await new Promise(resolve => setTimeout(resolve, 2100))
  await page.bringToFront(); await page.waitForTimeout(150)
  const after = await page.getByTestId('sim-time').textContent()
  await other.close()
  const report = { at: new Date().toISOString(), browser: 'Microsoft Edge (headless)', url, measurements, errors, background: { observedVisibility: backgroundState, before, after, realBackgroundTabVerified: backgroundState === 'hidden' }, deviceGuarantee: false }
  assert.deepEqual(errors, [])
  await writeFile('reports/browser-performance-1.4.json', JSON.stringify(report, null, 2))
} finally { await context.close(); await browser.close() }
