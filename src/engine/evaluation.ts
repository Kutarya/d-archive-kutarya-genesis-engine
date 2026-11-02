import { copyDNA } from './genetics.ts'
import type { DNA } from './types.ts'
import { DEFAULT_CONFIG } from './types.ts'
import { finite } from './validation.ts'
import { World } from './world.ts'

export interface Assay { survivalSeconds: number; foodPerFounder: number; finalEnergyPerFounder: number; surviving: number }
export interface Comparison { seed: string; baseline: Assay; selected: Assay; survivalDelta: number; foodDelta: number }
export interface SelectionResult {
  seed: string; trainingSeconds: number; assaySeconds: number; births: number; deaths: number
  finalPopulation: number; maxGeneration: number; selectionPossible: boolean; comparisons: Comparison[]
}
export type ExperimentPhase = 'training' | 'baseline' | 'selected' | 'complete'
export interface ExperimentProgress { phase: ExperimentPhase; completedSteps: number; totalSteps: number; pair: number; simulationSeconds: number }
export interface ExperimentOptions { seeds: string[]; trainingSeconds: number; assaySeconds: number }
export interface ExperimentReport {
  schemaVersion: 1; modelVersion: '1.1.0'; options: ExperimentOptions; experiments: SelectionResult[]
  meanBaselineSurvival: number; meanSelectedSurvival: number; meanSurvivalDelta: number
  meanFoodDelta: number; elapsedSeconds: number; statisticalSignificanceClaimed: false
  runtime?: { userAgent: string; fixedStepSeconds: number }
}
export function validateExperimentOptions(input: ExperimentOptions): ExperimentOptions {
  if (!input || !Array.isArray(input.seeds) || input.seeds.length < 1 || input.seeds.length > 3) throw new Error('Deney için 1–3 tohum gerekli.')
  if (input.seeds.some(seed => typeof seed !== 'string' || !seed.trim() || seed.length > 96)) throw new Error('Deney tohumu 1–96 karakter olmalı.')
  const seeds = input.seeds.map(seed => seed.trim())
  if (new Set(seeds).size !== seeds.length) throw new Error('Bağımsız koşular için farklı tohumlar kullanın.')
  finite(input.trainingSeconds, 1, 240, 'Seçilim süresi', true)
  finite(input.assaySeconds, 1, 120, 'Değerlendirme süresi', true)
  return { seeds, trainingSeconds: input.trainingSeconds, assaySeconds: input.assaySeconds }
}

class AssayRunner {
  readonly world: World
  readonly totalSteps: number
  private aliveSeconds = 0
  constructor(genomes: readonly DNA[], seed: string, duration: number) {
    if (genomes.length === 0) throw new Error('Karşılaştırma için genom gerekli.')
    finite(duration, 1, 120, 'Değerlendirme süresi')
    this.world = new World({ ...DEFAULT_CONFIG, seed, initialPopulation: genomes.length, capacity: genomes.length, width: 1200, height: 800, foodCapacity: 300, foodRate: 10, reproductionEnabled: false }, genomes)
    this.totalSteps = Math.round(duration / this.world.config.stepSeconds)
  }
  step() { this.aliveSeconds += this.world.organisms.length * this.world.config.stepSeconds; this.world.step() }
  get done() { return this.world.tick === this.totalSteps }
  result(): Assay {
    if (!this.done) throw new Error('Değerlendirme henüz tamamlanmadı.')
    const population = this.world.config.initialPopulation
    return { survivalSeconds: this.aliveSeconds / population, foodPerFounder: this.world.totals.eaten / population, finalEnergyPerFounder: this.world.organisms.reduce((sum, o) => sum + o.energy, 0) / population, surviving: this.world.organisms.length }
  }
}
export function assay(genomes: readonly DNA[], seed: string, duration = 60): Assay {
  const run = new AssayRunner(genomes, seed, duration)
  while (!run.done) run.step()
  return run.result()
}

/** Aynı hesap yolu CLI ve Worker tarafından, farklı iş parçası boyutlarıyla kullanılır. */
export class SelectionRun {
  private world: World
  private founders: DNA[]
  private selected: DNA[] = []
  private current: AssayRunner | null = null
  private baseline: Assay | null = null
  private comparisons: Comparison[] = []
  private completedSteps = 0
  private phase: ExperimentPhase = 'training'
  private pair = 1
  private readonly trainingSteps: number
  private readonly totalSteps: number
  readonly seed: string
  readonly trainingSeconds: number
  readonly assaySeconds: number
  constructor(seed: string, trainingSeconds = 120, assaySeconds = 60) {
    const options = validateExperimentOptions({ seeds: [seed], trainingSeconds, assaySeconds })
    this.seed = options.seeds[0]; this.trainingSeconds = trainingSeconds; this.assaySeconds = assaySeconds
    this.world = new World({ ...DEFAULT_CONFIG, seed: this.seed, initialPopulation: 80, capacity: 240, width: 1200, height: 800, foodCapacity: 650, foodRate: 26 })
    this.founders = this.world.founders.map(copyDNA)
    this.trainingSteps = Math.round(trainingSeconds / this.world.config.stepSeconds)
    this.totalSteps = this.trainingSteps + Math.round(assaySeconds / this.world.config.stepSeconds) * 4
  }
  private sample(source: readonly DNA[]) { return Array.from({ length: 40 }, (_, i) => copyDNA(source[Math.floor(i * source.length / 40)])) }
  private testSeed() { return `${this.seed}/assay-${String(this.pair).padStart(2, '0')}` }
  private beginAssay(phase: 'baseline' | 'selected') {
    this.phase = phase
    this.current = new AssayRunner(this.sample(phase === 'baseline' ? this.founders : this.selected), this.testSeed(), this.assaySeconds)
  }
  advance(maxSteps = 120): ExperimentProgress {
    finite(maxSteps, 1, 100000, 'Deney iş parçası', true)
    for (let i = 0; i < maxSteps && !this.done; i++) {
      if (this.phase === 'training') {
        this.world.step(); this.completedSteps++
        if (this.world.tick === this.trainingSteps) {
          this.selected = this.world.organisms.length ? this.world.organisms.map(o => copyDNA(o.dna)) : this.founders.map(copyDNA)
          this.beginAssay('baseline')
        }
      } else if (this.current) {
        this.current.step(); this.completedSteps++
        if (this.current.done) {
          const result = this.current.result()
          if (this.phase === 'baseline') { this.baseline = result; this.beginAssay('selected') }
          else {
            const baseline = this.baseline!
            this.comparisons.push({ seed: this.testSeed(), baseline, selected: result, survivalDelta: result.survivalSeconds - baseline.survivalSeconds, foodDelta: result.foodPerFounder - baseline.foodPerFounder })
            if (this.pair < 2) { this.pair++; this.beginAssay('baseline') }
            else { this.phase = 'complete'; this.current = null }
          }
        }
      }
    }
    return this.progress
  }
  get done() { return this.phase === 'complete' }
  get progress(): ExperimentProgress { return { phase: this.phase, completedSteps: this.completedSteps, totalSteps: this.totalSteps, pair: this.pair, simulationSeconds: this.phase === 'training' ? this.world.time : this.current?.world.time ?? this.assaySeconds } }
  result(): SelectionResult {
    if (!this.done) throw new Error('Seçilim deneyi henüz tamamlanmadı.')
    return structuredClone({ seed: this.seed, trainingSeconds: this.trainingSeconds, assaySeconds: this.assaySeconds, births: this.world.totals.births, deaths: this.world.totals.deaths, finalPopulation: this.world.organisms.length, maxGeneration: Math.max(0, ...this.world.organisms.map(o => o.generation)), selectionPossible: this.world.organisms.length > 0 && this.world.totals.births > 0, comparisons: this.comparisons })
  }
}
export function selectionExperiment(seed: string, trainingSeconds = 120, assaySeconds = 60): SelectionResult {
  const run = new SelectionRun(seed, trainingSeconds, assaySeconds)
  while (!run.done) run.advance(1000)
  return run.result()
}
export function summarizeExperiments(options: ExperimentOptions, experiments: SelectionResult[], elapsedSeconds: number): ExperimentReport {
  options = validateExperimentOptions(options)
  finite(elapsedSeconds, 0, 1e7, 'Deney süresi')
  const pairs = experiments.flatMap(e => e.comparisons)
  if (experiments.length !== options.seeds.length || pairs.length !== experiments.length * 2 || experiments.some((e, i) => e.seed !== options.seeds[i] || e.trainingSeconds !== options.trainingSeconds || e.assaySeconds !== options.assaySeconds)) throw new Error('Eksik veya farklı deney sonuçları raporlanamaz.')
  const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length
  return { schemaVersion: 1, modelVersion: '1.1.0', options: structuredClone(options), experiments: structuredClone(experiments), meanBaselineSurvival: mean(pairs.map(p => p.baseline.survivalSeconds)), meanSelectedSurvival: mean(pairs.map(p => p.selected.survivalSeconds)), meanSurvivalDelta: mean(pairs.map(p => p.survivalDelta)), meanFoodDelta: mean(pairs.map(p => p.foodDelta)), elapsedSeconds, statisticalSignificanceClaimed: false }
}
