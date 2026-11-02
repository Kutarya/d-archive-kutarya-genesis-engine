import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { writeFile } from 'node:fs/promises'
const url = process.env.GENESIS_TEST_URL || 'http://127.0.0.1:5173/'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, hasTouch: true })
const page = await context.newPage(), result = { at: new Date().toISOString(), url, checks: [], errors: [], trials: [], successful: false }
page.on('pageerror', error => result.errors.push(error.message))
await page.addInitScript(() => { const Native = window.Worker; window.__playWorkers = []; window.Worker = class extends Native { constructor(...args) { super(...args); window.__playWorkers.push(this) } }; window.__playRequest = 910000 })
const check = name => { result.checks.push(name); console.log(name) }
async function state(command) {
  return page.evaluate(command => new Promise((resolve, reject) => {
    const w = window.__playWorkers.at(-1), requestId = ++window.__playRequest
    const timeout = setTimeout(() => { w.removeEventListener('message', listener); reject(new Error('Gerçek Worker durum yanıtı gelmedi.')) }, 8000)
    const listener = e => { if (e.data.kind === 'state' && e.data.requestId === requestId) { clearTimeout(timeout); w.removeEventListener('message', listener); resolve(e.data.state) } }
    w.addEventListener('message', listener); if (command) w.postMessage(command); w.postMessage({ kind: 'export', requestId })
  }), command)
}
async function paused() { const pause = page.getByRole('button', { name: 'Akışı duraklat', exact: true }); if (await pause.count()) await pause.click(); await page.getByRole('button', { name: 'Akışı sürdür', exact: true }).waitFor() }
async function centerClick() { await page.locator('.world-canvas').scrollIntoViewIfNeeded(); const box = await page.locator('.world-canvas').boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2) }
async function start(title) { await page.getByRole('button', { name: 'Keşif görevlerini aç', exact: true }).click(); await page.getByRole('button', { name: `${title} görevini başlat`, exact: true }).click(); await page.locator('.mission-hud').waitFor(); await paused(); return state() }
async function selectMiddle(world) {
  await page.getByRole('button', { name: 'Dünyayı ekrana sığdır', exact: true }).click(); await page.waitForTimeout(160)
  const box = await page.locator('.world-canvas').boundingBox(), dimensions = await page.locator('.world-canvas').evaluate(el => ({ width: el.clientWidth, height: el.clientHeight }))
  const scale = Math.max(.08, Math.min(3, Math.min((dimensions.width - 44) / world.config.width, (dimensions.height - 44) / world.config.height)))
  const organism = world.organisms.find(o => Math.abs(o.x - world.config.width / 2) < world.config.width * .2 && Math.abs(o.y - world.config.height / 2) < world.config.height * .2)
  assert(organism)
  await page.mouse.click(box.x + dimensions.width / 2 + (organism.x - world.config.width / 2) * scale, box.y + dimensions.height / 2 + (organism.y - world.config.height / 2) * scale)
  await page.getByRole('heading', { name: `G-${String(organism.id).padStart(4, '0')}`, exact: true }).waitFor()
  return organism
}
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: /^Laboratuvar/ }).click(); await page.waitForSelector('.world-canvas canvas'); await paused()
  await page.locator('.laboratory').screenshot({ path: 'reports/laboratory-1.4.png' })
  const before = await state()
  await page.getByRole('button', { name: 'Dünya aracı: Besin fırçası', exact: true }).click()
  await page.getByRole('slider', { name: 'Araç yarıçapı', exact: true }).focus(); await page.keyboard.press('Home'); for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight')
  await page.locator('.world-canvas').scrollIntoViewIfNeeded()
  const box = await page.locator('.world-canvas').boundingBox()
  const mapBefore = await page.getByTestId('map-viewport').getAttribute('x')
  await page.mouse.move(box.x + box.width / 2 - 135, box.y + box.height / 2); await page.mouse.down()
  for (let i = 0; i < 7; i++) { await page.mouse.move(box.x + box.width / 2 - 100 + i * 35, box.y + box.height / 2); await page.waitForTimeout(110) }
  await page.mouse.up()
  const painted = await state(); assert(painted.food.length >= before.food.length + 48); assert.equal(painted.tick, before.tick)
  assert.equal(await page.getByTestId('map-viewport').getAttribute('x'), mapBefore); check('Sürüklenen fırça gerçek besin ekliyor, kamerayı taşımıyor')
  const foodBeforePan = painted.food.length
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down({ button: 'right' }); await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2); await page.mouse.up({ button: 'right' }); await page.waitForTimeout(150)
  assert.notEqual(await page.getByTestId('map-viewport').getAttribute('x'), mapBefore); assert.equal((await state()).food.length, foodBeforePan); check('Besin aracında sağ tuş yalnız kamerayı taşıyor')
  await page.getByRole('button', { name: 'Dünya aracı: Tehlike ekle', exact: true }).click(); await centerClick()
  const hazard = await state(); assert.equal(hazard.hazards.length, painted.hazards.length + 1)
  await page.getByRole('button', { name: 'Dünya aracı: Tehlike temizle', exact: true }).click(); await centerClick()
  assert.equal((await state()).hazards.length, painted.hazards.length); check('Tehlike ekleme ve temizleme gerçek dünya bölgelerini değiştiriyor')
  await page.getByRole('button', { name: 'Dünya aracı: Canlı seç', exact: true }).click()
  const xBefore = await page.getByTestId('map-viewport').getAttribute('x'), map = await page.getByRole('button', { name: 'Mini harita: kamerayı taşı', exact: true }).boundingBox()
  await page.mouse.click(map.x + map.width * .8, map.y + map.height * .7); await page.waitForTimeout(170)
  assert.notEqual(await page.getByTestId('map-viewport').getAttribute('x'), xBefore); check('Mini harita gerçek kamera merkezini değiştiriyor')
  const keyboardBefore = await state(); await page.getByRole('button', { name: 'Mini harita: kamerayı taşı', exact: true }).focus(); await page.keyboard.press('Space'); assert.deepEqual(await state(), keyboardBefore)
  check('Mini haritanın klavye kontrolü simülasyonu yanlışlıkla başlatmıyor')
  const widthBefore = await page.locator('.world-canvas').evaluate(el => el.clientWidth)
  await page.getByRole('button', { name: 'Odak görünümünü aç', exact: true }).click(); await page.locator('.world-focus').waitFor()
  assert((await page.locator('.world-canvas').evaluate(el => el.clientWidth)) > widthBefore)
  assert.equal(await page.locator('.main-header').evaluate(el => el.inert), true)
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.world-focus'))
  assert.equal(await page.locator('.main-header').evaluate(el => el.inert), false); check('Odak görünümü büyüyor; Escape ve klavye erişimi güvenli dönüyor')
  await page.getByRole('button', { name: 'Kullanım kılavuzu', exact: true }).click(); await page.getByRole('dialog', { name: 'Dünya kullanım kılavuzu', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Kullanım kılavuzunu kapat', exact: true }).click(); check('Kullanım rehberi gerçek kontrolleri açıklıyor ve kapanıyor')

  const contact = await start('İlk temas'); assert.equal(contact.organisms.length, 90)
  assert.equal(await page.getByRole('button', { name: 'Dünya aracı: Canlı ekle', exact: true }).isDisabled(), true)
  assert.equal(await page.getByRole('slider', { name: 'Sıcaklık', exact: true }).isDisabled(), true)
  await selectMiddle(contact); await page.getByRole('button', { name: 'Sinir ağı', exact: true }).click(); await page.getByTestId('goal-brain').filter({ hasText: '1/1' }).waitFor()
  assert.equal(await page.locator('.brain-view > svg circle').count(), 27)
  await page.getByRole('button', { name: 'Seçili canlıya yakından bak', exact: true }).click(); await page.locator('.world-focus').waitFor(); await page.locator('.world-panel').screenshot({ path: 'reports/microscope-1.4.png' })
  await page.getByRole('button', { name: 'Odak görünümünü kapat', exact: true }).click()
  await page.getByRole('button', { name: 'Takibi durdur', exact: true }).click()
  await page.getByRole('button', { name: 'Dünya aracı: Besin fırçası', exact: true }).click(); await centerClick(); await centerClick()
  await page.locator('.mission-outcome.complete').waitFor()
  const completed = await state(); await page.waitForTimeout(250); assert.deepEqual(await state(), completed)
  assert((await page.locator('.outcome-stats').textContent()).includes('24/24')); check('İlk temas gerçek seçim/beyin/24 besin ile tamamlanıyor ve motor duruyor')
  await page.getByRole('button', { name: 'Aynı görevi yeniden başlat', exact: true }).click(); await page.locator('.mission-hud').waitFor(); await paused()
  assert.equal((await state()).organisms.length, 90); assert.equal(await page.getByTestId('food-budget').textContent(), '120'); check('Yeniden dene görev evrenini ve bütçeyi yeniden kuruyor')
  await page.getByRole('button', { name: 'Görevi bırak ve serbest keşfe geç', exact: true }).click(); await paused()
  assert.equal(await page.locator('.mission-hud').count(), 0); assert.equal(await page.getByRole('slider', { name: 'Sıcaklık', exact: true }).isDisabled(), false); check('Serbest keşif dünyayı koruyor ve görev kısıtlarını kaldırıyor')

  for (const [title, duration, spacing] of [['Yaşamı koru', 90, 6], ['Kıtlık dengesi', 120, 10]]) {
    let world = await start(title)
    for (let second = 0; second < duration; second += 2) {
      if (second % spacing === 0 && world.organisms.length) {
        const o = world.organisms.reduce((weakest, value) => value.energy < weakest.energy ? value : weakest)
        world = await state({ kind: 'place', tool: 'food', x: o.x, y: o.y, radius: 32 })
        if (second === duration - spacing) { const limited = await state({ kind: 'place', tool: 'food', x: o.x, y: o.y, radius: 32 }); assert.deepEqual(limited, world) }
      }
      world = await state({ kind: 'step', count: 120 })
    }
    await page.locator('.mission-outcome').waitFor()
    result.trials.push({ title, population: world.organisms.length, births: world.totals.births, elapsed: world.tick * world.config.stepSeconds, status: await page.locator('.mission-outcome').getAttribute('class') })
    assert.equal(await page.locator('.mission-outcome.complete').count(), 1, `${title} gerçek motor pilotunda tamamlanamadı`)
    assert.deepEqual(await state(), world)
    check(`${title}: zamanlı hedefler gerçek Worker pilotunda tamamlanıyor`)
  }
  await page.getByRole('button', { name: 'Serbest keşfe devam', exact: true }).click(); await paused()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Dünya aracı: Besin fırçası', exact: true }).click(); await page.locator('.world-canvas').scrollIntoViewIfNeeded()
  const mobileBefore = await state(), mobileBox = await page.locator('.world-canvas').boundingBox()
  await page.touchscreen.tap(mobileBox.x + mobileBox.width / 2, mobileBox.y + mobileBox.height / 2)
  assert((await state()).food.length > mobileBefore.food.length)
  const session = await context.newCDPSession(page), mobile = await page.locator('.world-canvas').boundingBox(), cx = mobile.x + mobile.width / 2, cy = mobile.y + mobile.height / 2
  const beforePinch = await state(), zoomBefore = await page.locator('.camera-controls>span').textContent()
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 30, y: cy, id: 1 }, { x: cx + 30, y: cy, id: 2 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - 70, y: cy, id: 1 }, { x: cx + 70, y: cy, id: 2 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(100)
  assert.notEqual(await page.locator('.camera-controls>span').textContent(), zoomBefore); assert.deepEqual(await state(), beforePinch)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await page.locator('.world-panel').screenshot({ path: 'reports/play-mobile-1.4.png' }); check('Mobil dokunma besin ekliyor; iki parmak zoom boyama yapmıyor ve yatay taşma yok')
  assert.deepEqual(result.errors, []); result.successful = true
  console.log(JSON.stringify({ successful: true, checks: result.checks.length, trials: result.trials }))
} catch (error) { result.failure = error.message.slice(0, 700); await page.screenshot({ path: 'reports/play-failure-1.4.png', fullPage: true }).catch(() => {}); throw new Error(result.failure) }
finally { await writeFile('reports/play-acceptance-1.4.json', JSON.stringify(result, null, 2)); await context.close(); await browser.close() }
