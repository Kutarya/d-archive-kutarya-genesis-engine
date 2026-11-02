// Test gözlemi gerçek Worker'ı kullanır; ürün kaynaklarına test API'si eklemez.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { writeFile } from 'node:fs/promises'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()
await page.addInitScript(() => {
  const Native = window.Worker
  window.__genesisWorkers = []
  window.Worker = class extends Native { constructor(...args) { super(...args); window.__genesisWorkers.push(this) } }
})
async function state() {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const worker = window.__genesisWorkers.at(-1), requestId = 800001
    const timeout = setTimeout(() => reject(new Error('Worker yanıt vermedi.')), 5000)
    const listener = event => { if (event.data.kind === 'state' && event.data.requestId === requestId) { clearTimeout(timeout); worker.removeEventListener('message', listener); resolve(event.data.state) } }
    worker.addEventListener('message', listener); worker.postMessage({ kind: 'export', requestId })
  }))
}
try {
  await page.goto('http://127.0.0.1:5174/genesis/', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="population"]')?.textContent) > 0)
  await page.evaluate(() => window.__genesisWorkers.at(-1).postMessage({ kind: 'visibility', hidden: true }))
  const hiddenStart = await state(); await page.waitForTimeout(1200); const hiddenEnd = await state()
  assert.deepEqual(hiddenEnd, hiddenStart)
  await page.evaluate(() => window.__genesisWorkers.at(-1).postMessage({ kind: 'visibility', hidden: false }))
  await page.waitForTimeout(250); const resumed = await state()
  assert(resumed.tick > hiddenEnd.tick)
  await writeFile('reports/worker-acceptance.json', JSON.stringify({ at: new Date().toISOString(), realWorkerUsed: true, backgroundProtocolStopsAllSimulationChanges: true, resumesWithoutCatchup: resumed.tick - hiddenEnd.tick < 30, resumedSteps: resumed.tick - hiddenEnd.tick, nativeTabVisibilityVerified: false, note: 'Headless Edge sekme değişiminde visible kalıyor; burada gerçek Worker görünürlük mesajı sınandı. Yerel sekme görünürlüğü otomatik testi ayrı ve doğrulanmış değil.' }, null, 2))
  console.log(JSON.stringify({ realWorker: true, hiddenTickUnchanged: true, resumedSteps: resumed.tick - hiddenEnd.tick }))
} finally { await browser.close() }
