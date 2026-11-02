import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { selectionExperiment } from '../src/engine/evaluation.ts'
import type { SelectionResult } from '../src/engine/evaluation.ts'
const reference = JSON.parse(await readFile('reports/1.0/evolution.json', 'utf8')) as { experiments: SelectionResult[] }
const checks = []
for (const previous of reference.experiments) {
  const current = selectionExperiment(previous.seed, previous.trainingSeconds, previous.assaySeconds)
  assert.deepEqual(current, previous)
  checks.push({ seed: current.seed, resultExactlyMatches1_0: true, births: current.births, finalPopulation: current.finalPopulation })
}
await writeFile('reports/algorithm-regression-1.1.json', JSON.stringify({ at: new Date().toISOString(), checks, simulationRulesUnchanged: true }, null, 2))
console.log(JSON.stringify(checks))
