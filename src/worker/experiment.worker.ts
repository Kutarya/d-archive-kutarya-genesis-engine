/// <reference lib="webworker" />
import { SelectionRun, summarizeExperiments, validateExperimentOptions } from '../engine/evaluation.ts'
import type { ExperimentOptions, SelectionResult } from '../engine/evaluation.ts'
import type { ExperimentCommand, ExperimentResponse } from './experiment.protocol.ts'
import { DEFAULT_CONFIG } from '../engine/types.ts'

const scope = self as unknown as DedicatedWorkerGlobalScope
let options: ExperimentOptions | null = null, run: SelectionRun | null = null, results: SelectionResult[] = []
let timer: number | undefined, started = 0, lastProgress = 0
function send(response: ExperimentResponse) { scope.postMessage(response) }
function stop() { if (timer !== undefined) clearTimeout(timer); timer = undefined; run = null; options = null }
function progress() {
  if (!options || !run) return
  const part = run.progress
  send({ kind: 'progress', status: { seed: run.seed, index: results.length + 1, count: options.seeds.length, completedSteps: results.length * part.totalSteps + part.completedSteps, totalSteps: options.seeds.length * part.totalSteps, progress: part, completed: results } })
  lastProgress = performance.now()
}
function work() {
  if (!options || !run) return
  try {
    const deadline = performance.now() + 5
    do { run.advance(12) } while (!run.done && performance.now() < deadline)
    if (run.done) {
      results.push(run.result())
      if (results.length === options.seeds.length) {
        const report = summarizeExperiments(options, results, (performance.now() - started) / 1000)
        report.runtime = { userAgent: scope.navigator.userAgent, fixedStepSeconds: DEFAULT_CONFIG.stepSeconds }
        send({ kind: 'complete', report }); stop(); return
      }
      run = new SelectionRun(options.seeds[results.length], options.trainingSeconds, options.assaySeconds)
      progress()
    } else if (performance.now() - lastProgress > 100) progress()
    timer = setTimeout(work, 8)
  } catch (error) { stop(); send({ kind: 'error', message: error instanceof Error ? error.message : 'Deney çalıştırılamadı.' }) }
}
scope.onmessage = (event: MessageEvent<ExperimentCommand>) => {
  if (event.data.kind === 'cancel') { stop(); send({ kind: 'cancelled' }); return }
  try {
    if (run) throw new Error('Bir deney zaten çalışıyor.')
    options = validateExperimentOptions(event.data.options)
    results = []; started = performance.now(); run = new SelectionRun(options.seeds[0], options.trainingSeconds, options.assaySeconds)
    progress(); timer = setTimeout(work, 0)
  } catch (error) { stop(); send({ kind: 'error', message: error instanceof Error ? error.message : 'Deney ayarları geçersiz.' }) }
}
