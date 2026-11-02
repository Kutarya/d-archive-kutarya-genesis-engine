import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
await mkdir('reports', { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = [], consoleErrors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="population"]')?.textContent?.replaceAll('.', '')) > 0)
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'reports/laboratory.png', fullPage: true })
  const info = await page.evaluate(() => ({ population: document.querySelector('[data-testid="population"]')?.textContent, fps: document.querySelector('[data-testid="fps"]')?.textContent, sps: document.querySelector('[data-testid="sps"]')?.textContent, renderer: document.querySelector('.world-bottomline')?.textContent, canvas: document.querySelectorAll('.world-canvas canvas').length, overflow: document.documentElement.scrollWidth > innerWidth }))
  await writeFile('reports/first-browser.json', JSON.stringify({ ...info, errors, consoleErrors }, null, 2))
  console.log(JSON.stringify({ ...info, errors, consoleErrors }))
} catch (error) { console.log(JSON.stringify({ errors, consoleErrors })); throw error } finally { await browser.close() }
