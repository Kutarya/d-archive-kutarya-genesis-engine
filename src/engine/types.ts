import type { PopulationAnalysis } from './analysis.ts'
import type { ChallengeView } from '../game/challenges.ts'
export const INPUTS = 12
export const HIDDEN = 12
export const OUTPUTS = 3
export const WEIGHT_COUNT = INPUTS * HIDDEN + HIDDEN + HIDDEN * OUTPUTS + OUTPUTS
export const STRIDE = 10
export const MAX_HISTORY = 720
export interface WorldConfig {
  seed: string; width: number; height: number; initialPopulation: number; capacity: number
  foodCapacity: number; foodRate: number; temperature: number; mutationRate: number
  stepSeconds: number; reproductionEnabled: boolean
}
export interface DNA {
  maxSpeed: number; senseRadius: number; size: number; efficiency: number
  reproductionThreshold: number; movementCost: number; longevity: number; hue: number
  weights: number[]
}
export type Trait = Exclude<keyof DNA, 'weights'>
export interface Organism {
  id: number; x: number; y: number; heading: number; speed: number; energy: number
  age: number; generation: number; parents: number[]; lineage: number; dna: DNA
  eaten: number; children: number; cooldown: number; distance: number
  inputs: number[]; hidden: number[]; outputs: number[]
}
export interface Food { id: number; x: number; y: number; energy: number }
export interface Hazard { x: number; y: number; radius: number; intensity: number }
export interface Totals { births: number; deaths: number; eaten: number; starvation: number; ageing: number; hazard: number }
export interface Statistics {
  time: number; population: number; meanEnergy: number; meanGeneration: number
  meanSpeed: number; meanSense: number; meanSize: number; diversity: number
  births: number; deaths: number; food: number; lineages: number; eaten: number
}
export interface WorldState {
  schemaVersion: 1; config: WorldConfig; rngState: number; tick: number
  nextId: number; nextFoodId: number; foodAccumulator: number; nextSampleTick: number
  organisms: Organism[]; food: Food[]; hazards: Hazard[]; totals: Totals
  history: Statistics[]; founders: DNA[]
}
export interface WorldEvent { id: number; x: number; y: number; kind: 'birth' | 'death' | 'eat' }
export interface Frame {
  ids: Uint32Array; agents: Float32Array; food: Float32Array; hazards: Float32Array
  width: number; height: number; tick: number; stats: Statistics; selected: Organism | null
  seed: string; capacity: number; temperature: number; foodRate: number
  urgent?: boolean
  history?: Statistics[]; running: boolean; speed: number; stepsPerSecond: number
  analysis?: PopulationAnalysis
  challenge?: ChallengeView | null
  worldEpoch?: number
  behindSeconds: number; events: WorldEvent[]; sentAt: number
}
export const DEFAULT_CONFIG: WorldConfig = {
  seed: 'kutarya-genesis-01', width: 1800, height: 1100, initialPopulation: 300,
  capacity: 700, foodCapacity: 1000, foodRate: 24, temperature: 22,
  mutationRate: 0.035, stepSeconds: 1 / 60, reproductionEnabled: true,
}
export const energyCapacity = (dna: DNA) => 70 + dna.size * 20
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
