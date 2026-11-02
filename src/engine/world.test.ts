import { describe, expect, it } from 'vitest'
import { createDNA, forward, mutateDNA, TRAITS, traitKeys, validateDNA } from './genetics.ts'
import { Random } from './random.ts'
import { SpatialIndex } from './spatial.ts'
import { DEFAULT_CONFIG, energyCapacity, HIDDEN, INPUTS, OUTPUTS, WEIGHT_COUNT } from './types.ts'
import { parseWorldJSON, validateConfig, validateState } from './validation.ts'
import { energyCost, World } from './world.ts'

function arena(count = 1) {
  const world = new World({ ...DEFAULT_CONFIG, initialPopulation: count, foodRate: 0, foodCapacity: 30, mutationRate: 0, capacity: 20 })
  world.food = []; world.hazards = []
  return world
}
describe('Deterministik dünya ve genetik', () => {
  it('aynı seed ve aynı komutlar aynı durumu üretir', () => {
    const a = arena(10), b = arena(10)
    for (const w of [a, b]) { w.addFood(300, 200); w.addOrganism(500, 300); w.step(500); w.updateEnvironment({ temperature: 28 }); w.step(300) }
    expect(a.exportState()).toEqual(b.exportState())
  })
  it('başka seed başka dünya üretir', () => {
    const a = arena(), b = new World({ ...a.config, seed: 'başka-seed' })
    expect(a.organisms[0].dna).not.toEqual(b.organisms[0].dna)
  })
  it('RNG kaydı akışı aynı noktadan devam ettirir', () => {
    const a = new Random('rng'); a.next(); a.next(); const b = new Random(a.state)
    expect(Array.from({ length: 30 }, () => a.next())).toEqual(Array.from({ length: 30 }, () => b.next()))
  })
  it('sıfır mutasyonda kalıtım derin ve değişmezdir', () => {
    const dna = createDNA(new Random(13)), child = mutateDNA(dna, new Random(4), 0)
    expect(child).toEqual(dna); expect(child.weights).not.toBe(dna.weights)
  })
  it('bin mutasyonda tüm genler ve ağırlıklar sınırlıdır', () => {
    const rng = new Random(71); let dna = createDNA(rng); const first = structuredClone(dna)
    for (let i = 0; i < 1000; i++) { dna = mutateDNA(dna, rng, 0.2); validateDNA(dna) }
    expect(dna).not.toEqual(first)
    for (const key of traitKeys) expect(dna[key]).toBeGreaterThanOrEqual(TRAITS[key].min)
    expect(() => mutateDNA(dna, rng, NaN)).toThrow()
  })
})
describe('Enerji, besin ve doğal seçilim kapıları', () => {
  it('hareket ve büyük vücut daha yüksek enerji maliyetine sahiptir', () => {
    const o = arena().organisms[0]; o.speed = 0; const rest = energyCost(o, 22)
    o.speed = 90; expect(energyCost(o, 22)).toBeGreaterThan(rest)
    o.speed = 0; o.dna.size = 10; expect(energyCost(o, 22)).toBeGreaterThan(rest)
    expect(energyCost(o, 44)).toBeGreaterThan(energyCost(o, 22))
  })
  it('besin enerji kazandırır ve sadece bir kez tüketilir', () => {
    const w = arena(2); for (const o of w.organisms) { o.x = 200; o.y = 200; o.energy = 50; o.dna.weights.fill(0) }
    w.food = [{ id: w.nextFoodId++, x: 200, y: 200, energy: 15 }]; w.step()
    expect(w.totals.eaten).toBe(1); expect(w.food).toHaveLength(0)
    expect(w.organisms.filter(o => o.energy > 50)).toHaveLength(1)
  })
  it('yeterli enerji, yaş ve ağ isteği varsa üreme enerji aktarır', () => {
    const w = arena(), p = w.organisms[0]; p.age = 12; p.energy = energyCapacity(p.dna); p.dna.weights.fill(0)
    const before = p.energy; w.step()
    expect(w.organisms).toHaveLength(2); const child = w.organisms[1]
    expect(child.parents).toEqual([p.id]); expect(child.generation).toBe(1); expect(child.dna).toEqual(p.dna)
    expect(child.energy + p.energy).toBeLessThan(before); expect(w.totals.births).toBe(1)
  })
  it('yetersiz enerji veya yaş üremeyi engeller', () => {
    const w = arena(); w.organisms[0].energy = 15; w.organisms[0].age = 30; w.step(); expect(w.organisms).toHaveLength(1)
    w.organisms[0].energy = energyCapacity(w.organisms[0].dna); w.organisms[0].age = 0; w.step(); expect(w.organisms).toHaveLength(1)
  })
  it('kapasite asla aşılmaz', () => {
    const w = arena(2); w.config.capacity = 2
    for (const o of w.organisms) { o.age = 20; o.energy = energyCapacity(o.dna); o.dna.weights.fill(0) }
    w.step(20); expect(w.organisms.length).toBeLessThanOrEqual(2); expect(() => w.addOrganism()).toThrow()
  })
  it('açlık, yaş ve geçersiz enerji canlıyı öldürür', () => {
    for (const reason of ['energy', 'age', 'nan']) {
      const w = arena(), o = w.organisms[0]
      if (reason === 'energy') o.energy = 0.001
      if (reason === 'age') o.age = o.dna.longevity
      if (reason === 'nan') o.energy = NaN
      w.step(); expect(w.organisms).toHaveLength(0); expect(w.totals.deaths).toBe(1)
    }
  })
  it('tehlike enerji kaybını artırır', () => {
    const a = arena(), b = World.fromState(a.exportState()); const o = b.organisms[0]
    b.addHazard(o.x, o.y, 100, 1); a.step(); b.step(); expect(b.organisms[0].energy).toBeLessThan(a.organisms[0].energy)
  })
  it('sabit adım değişince besin üretim hızı kaybolmaz', () => {
    const w = new World({ ...DEFAULT_CONFIG, initialPopulation: 0, foodCapacity: 1000, foodRate: 100, stepSeconds: 1 / 20 })
    w.food = []; w.step(20); expect(w.food).toHaveLength(100)
  })
  it('birden çok seed ile uzun koşuda tüm değerler sonlu kalır', () => {
    for (const seed of ['a', 'b', 'c']) {
      const w = new World({ ...DEFAULT_CONFIG, seed, initialPopulation: 50, capacity: 100 })
      w.step(1500); validateState(w.exportState())
      expect(w.organisms.every(o => Number.isFinite(o.energy) && o.energy > 0)).toBe(true)
      expect(w.organisms.length).toBeLessThanOrEqual(100)
    }
  })
})
describe('Sinir ağı ve uzamsal arama', () => {
  it('bilinen ağırlıklar beklenen tanh hesaplarını verir', () => {
    const weights = new Array<number>(WEIGHT_COUNT).fill(0), input = new Array<number>(INPUTS).fill(0)
    const hidden = new Array<number>(HIDDEN), output = new Array<number>(OUTPUTS)
    weights[0] = 0.5; input[0] = 1; weights[INPUTS * HIDDEN + HIDDEN] = 2
    forward(weights, input, hidden, output)
    expect(hidden[0]).toBeCloseTo(Math.tanh(0.5)); expect(output[0]).toBeCloseTo(Math.tanh(2 * Math.tanh(0.5)))
    expect(output[1]).toBe(0)
  })
  it('çıktılar sınırlı; bozuk girdi veya ağırlık NaN üretmez', () => {
    const h: number[] = [], o: number[] = [], w = new Array<number>(WEIGHT_COUNT).fill(1e20)
    forward(w, new Array<number>(INPUTS).fill(Infinity), h, o); expect(o.every(v => Number.isFinite(v) && Math.abs(v) <= 1)).toBe(true)
    w[0] = NaN; forward(w, new Array<number>(INPUTS).fill(1), h, o); expect(o.every(Number.isFinite)).toBe(true)
    expect(() => forward([], [], h, o)).toThrow()
  })
  it('uzamsal arama yerel doğru besini seçer', () => {
    const grid = new SpatialIndex<{ x: number; y: number }>(1000); const close = { x: 108, y: 100 }
    grid.rebuild([close, { x: 900, y: 900 }, { x: 120, y: 100 }])
    expect(grid.nearest(100, 100, 30)).toBe(close); expect(grid.count(100, 100, 30)).toBe(2)
    expect(grid.nearest(500, 500, 20)).toBeNull()
  })
})
describe('Durum bütünlüğü', () => {
  it('kaydet/yükle sonrası aynı komutlar aynı geleceği verir', () => {
    const a = arena(12); a.step(337); const b = World.fromState(parseWorldJSON(JSON.stringify(a.exportState())))
    for (const w of [a, b]) { w.addFood(); w.addOrganism(); w.step(500) }
    expect(b.exportState()).toEqual(a.exportState())
  })
  it('bozuk değerler, sürüm ve yinelenen kimlik reddedilir', () => {
    const base = arena(2).exportState()
    for (const mutation of [(s: typeof base) => { s.rngState = NaN }, (s: typeof base) => { s.organisms[0].dna.weights[0] = Infinity }, (s: typeof base) => { s.organisms[1].id = s.organisms[0].id }, (s: typeof base) => { s.organisms[0].energy = -1 }, (s: typeof base) => { s.schemaVersion = 2 as 1 }]) {
      const broken = structuredClone(base); mutation(broken); expect(() => World.fromState(broken)).toThrow()
    }
    expect(() => parseWorldJSON('{bozuk')).toThrow()
    expect(() => validateConfig({ ...DEFAULT_CONFIG, initialPopulation: 4000 })).toThrow()
  })
  it('dışa verilen durum motorun DNA dizilerini değiştirmez', () => {
    const w = arena(), state = w.exportState(), value = w.organisms[0].dna.weights[0]
    state.organisms[0].dna.weights[0] = 0; expect(w.organisms[0].dna.weights[0]).toBe(value)
  })
})
