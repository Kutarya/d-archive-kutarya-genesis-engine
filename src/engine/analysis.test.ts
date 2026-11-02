import { expect, it } from 'vitest'
import { analyzePopulation } from './analysis.ts'
import { historyCSV } from './csv.ts'
import { applyPreset, PRESETS } from './presets.ts'
import { DEFAULT_CONFIG } from './types.ts'
import { validateConfig } from './validation.ts'
import { World } from './world.ts'

it('gen histogramları canlıları bir kez sayar ve kurucu DNA değişmez', () => {
  const world = new World({ ...DEFAULT_CONFIG, initialPopulation: 3 })
  const before = world.exportState()
  world.organisms[0].dna.maxSpeed = 24; world.organisms[1].dna.maxSpeed = 140; world.organisms[2].dna.maxSpeed = 82
  const data = analyzePopulation(world.organisms, world.founders, world.totals, 22)
  expect(data.traits).toHaveLength(7)
  for (const trait of data.traits) expect(trait.bins.reduce((sum, count) => sum + count, 0)).toBe(3)
  const speed = data.traits.find(t => t.key === 'maxSpeed')!
  expect(speed.mean).toBe(82); expect(speed.min).toBe(24); expect(speed.max).toBe(140)
  expect(speed.bins[0]).toBe(1); expect(speed.bins[11]).toBe(1)
  expect(speed.founderMean).toBe(before.founders.reduce((sum, dna) => sum + dna.maxSpeed, 0) / 3)
  expect(world.founders).toEqual(before.founders)
})
it('soylar ve nesiller gerçek canlılardan toplanır', () => {
  const world = new World({ ...DEFAULT_CONFIG, initialPopulation: 4 })
  world.organisms[1].lineage = 1; world.organisms[1].generation = 2
  world.organisms[2].generation = 1
  const data = analyzePopulation(world.organisms, world.founders, world.totals, 22)
  expect(data.lineages[0]).toEqual({ id: 1, count: 2, meanGeneration: 1 })
  expect(data.generations).toEqual([{ generation: 0, count: 2 }, { generation: 1, count: 1 }, { generation: 2, count: 1 }])
  expect(data.meanEnergyCost).toBeGreaterThan(0)
})
it('tükenen popülasyon analizi NaN veya sahte min/max üretmez', () => {
  const world = new World({ ...DEFAULT_CONFIG, initialPopulation: 0 })
  world.totals.starvation = 2; world.totals.ageing = 3; world.totals.hazard = 1
  const data = analyzePopulation([], [], world.totals, 22)
  expect(data.meanEnergyCost).toBe(0); expect(data.lineages).toEqual([])
  expect(data.deaths).toEqual({ starvation: 2, ageing: 3, hazard: 1 })
  for (const trait of data.traits) { expect(trait.mean).toBe(0); expect(trait.min).toBeNull(); expect(trait.max).toBeNull(); expect(trait.founderMean).toBeNull(); expect(trait.deviation).toBe(0) }
})
it('çevre senaryoları güvenlidir ve açık ayar nesnesini değiştirmez', () => {
  const before = { ...DEFAULT_CONFIG, seed: 'benim-tohumum', width: 2300 }
  for (const preset of PRESETS) {
    const result = applyPreset(before, preset.id); validateConfig(result)
    expect(result.seed).toBe('benim-tohumum'); expect(result.width).toBe(2300)
    expect(result.foodRate).toBe(preset.settings.foodRate)
  }
  expect(before.foodRate).toBe(DEFAULT_CONFIG.foodRate)
})
it('CSV bütün gerçek geçmiş alanlarını aynı örneklerden aktarır', () => {
  const world = new World({ ...DEFAULT_CONFIG, initialPopulation: 2 })
  world.step(60)
  const lines = historyCSV(world.history).split('\r\n')
  expect(lines).toHaveLength(world.history.length + 1)
  expect(lines[0]).toContain('simulasyon_saniyesi,canli_sayisi,ortalama_enerji')
  const last = lines.at(-1)!.split(',').map(Number), sample = world.history.at(-1)!
  expect(last[0]).toBe(sample.time); expect(last[1]).toBe(sample.population); expect(last[2]).toBe(sample.meanEnergy)
  expect(last.every(Number.isFinite)).toBe(true)
})
