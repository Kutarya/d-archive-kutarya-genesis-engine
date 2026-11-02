import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { writeFile } from 'node:fs/promises'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const results = []
try {
  for (const all of [false, true]) {
    const context = await browser.newContext()
    await context.addInitScript(blockAll => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { if (blockAll || type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null; return original.call(this, type, ...args) }
    }, all)
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('http://127.0.0.1:5174/genesis/', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="population"]')?.textContent) > 0)
    const before = await page.getByTestId('sim-time').textContent()
    await page.waitForFunction(previous => document.querySelector('[data-testid="sim-time"]')?.textContent !== previous, before)
    const after = await page.getByTestId('sim-time').textContent()
    if (all) {
      await page.getByText('Grafik API’si açılamadı.', { exact: false }).waitFor()
      await page.waitForTimeout(1100)
      assert((await page.getByTestId('fps').textContent()).startsWith('0'))
    } else await page.waitForFunction(() => document.querySelector('.world-bottomline')?.textContent?.includes('Canvas 2D'))
    assert.deepEqual(errors, [])
    results.push({ graphicsApisDisabledForTest: all ? 'all' : 'webgl', successful: true, engineContinues: after !== before, beforeSimulationTime: before, afterSimulationTime: after, pageErrors: errors })
    await context.close()
  }
  await writeFile('reports/fallback-acceptance-1.4.json', JSON.stringify({ at: new Date().toISOString(), results, simulatedApiFailure: true }, null, 2))
  console.log(JSON.stringify(results))
} finally { await browser.close() }
