import { expect, it } from 'vitest'
import { createDNA } from './genetics.ts'
import { Random } from './random.ts'
import { assay, SelectionRun, selectionExperiment, summarizeExperiments, validateExperimentOptions } from './evaluation.ts'
it('kontrollü değerlendirme aynı DNA/seed ile aynı ölçümü verir', () => {
  const rng = new Random('deney'), genomes = Array.from({ length: 5 }, () => createDNA(rng))
  const a = assay(genomes, 'sabit-koşul', 1), b = assay(genomes, 'sabit-koşul', 1)
  expect(a).toEqual(b); expect(a.surviving).toBeLessThanOrEqual(5)
  expect(a.survivalSeconds).toBeCloseTo(1); expect(Number.isFinite(a.finalEnergyPerFounder)).toBe(true)
})
it('farklı Worker iş parçası boyutları aynı tam deneyi üretir', () => {
  const a = new SelectionRun('chunk-test', 20, 3), b = new SelectionRun('chunk-test', 20, 3)
  while (!a.done) a.advance(1)
  while (!b.done) b.advance(127)
  expect(a.result()).toEqual(b.result())
  expect(a.result()).toEqual(selectionExperiment('chunk-test', 20, 3))
  expect(a.progress.completedSteps).toBe(a.progress.totalSteps)
  expect(a.progress.totalSteps).toBe((20 + 3 * 4) * 60)
})
it('deney ilerlemesi tam hesap adımlarını sayar ve eksik sonucu yayınlamaz', () => {
  const run = new SelectionRun('progress-test', 1, 1), phases = new Set<string>()
  expect(() => run.result()).toThrow()
  let previous = 0
  while (!run.done) {
    const progress = run.advance(1); phases.add(progress.phase)
    expect(progress.completedSteps).toBe(previous + 1); previous = progress.completedSteps
    expect(progress.completedSteps).toBeLessThanOrEqual(progress.totalSteps)
  }
  expect([...phases].sort()).toEqual(['baseline', 'complete', 'selected', 'training'])
  expect(run.result().selectionPossible).toBe(false)
})
it('deney kapasitesi ve süresi sınırlanır, yinelenen tohumlar reddedilir', () => {
  for (const options of [
    { seeds: [], trainingSeconds: 120, assaySeconds: 60 },
    { seeds: ['a', 'a'], trainingSeconds: 120, assaySeconds: 60 },
    { seeds: ['a', 'b', 'c', 'd'], trainingSeconds: 120, assaySeconds: 60 },
    { seeds: ['a'], trainingSeconds: Infinity, assaySeconds: 60 },
    { seeds: ['a'], trainingSeconds: 120, assaySeconds: 121 },
    { seeds: ['a'], trainingSeconds: 0, assaySeconds: 60 },
  ]) expect(() => validateExperimentOptions(options)).toThrow()
  const run = new SelectionRun('a', 1, 1)
  expect(() => run.advance(NaN)).toThrow()
  expect(() => run.advance(0)).toThrow()
})
it('çoklu deney özeti gerçek çiftleri kullanır; eksik raporu reddeder', () => {
  const options = { seeds: ['report-a', 'report-b'], trainingSeconds: 1, assaySeconds: 1 }
  const results = options.seeds.map(seed => selectionExperiment(seed, 1, 1))
  const report = summarizeExperiments(options, results, 2)
  const deltas = results.flatMap(r => r.comparisons.map(c => c.foodDelta))
  expect(report.meanFoodDelta).toBe(deltas.reduce((sum, v) => sum + v, 0) / 4)
  expect(report.statisticalSignificanceClaimed).toBe(false)
  expect(() => summarizeExperiments(options, results.slice(0, 1), 1)).toThrow()
  expect(() => summarizeExperiments(options, results.reverse(), 1)).toThrow()
})
