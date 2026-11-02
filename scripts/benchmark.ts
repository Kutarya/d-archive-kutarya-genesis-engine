import { mkdir, writeFile } from 'node:fs/promises'
import { cpus } from 'node:os'
import { DEFAULT_CONFIG } from '../src/engine/types.ts'
import { World } from '../src/engine/world.ts'
const results = []
for (const population of [500, 1000]) {
  const w = new World({ ...DEFAULT_CONFIG, initialPopulation: population, capacity: population, foodCapacity: 1600, reproductionEnabled: false })
  w.step(60)
  const times = []
  for (let i = 0; i < 300; i++) { const start = performance.now(); w.step(); times.push(performance.now() - start) }
  times.sort((a, b) => a - b)
  const mean = times.reduce((s, v) => s + v, 0) / times.length
  results.push({ requestedPopulation: population, finalPopulation: w.organisms.length, measuredSteps: times.length, meanStepMs: mean, medianStepMs: times[Math.floor(times.length / 2)], p95StepMs: times[Math.floor(times.length * 0.95)], headlessStepsPerSecond: 1000 / mean, sixtyHzCpuBudgetFraction: mean / (1000 / 60) })
}
const report = { at: new Date().toISOString(), node: process.version, cpu: cpus()[0]?.model, engineOnly: true, browserFpsMeasured: false, results }
await mkdir('reports', { recursive: true }); await writeFile('reports/benchmark.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
