import { traitKeys, TRAITS } from './genetics.ts'
import type { DNA, Organism, Totals, Trait } from './types.ts'
import { energyCost } from './world.ts'

export interface TraitDistribution {
  key: Trait; count: number; mean: number; founderMean: number | null
  min: number | null; max: number | null; deviation: number; bins: number[]
}
export interface PopulationAnalysis {
  traits: TraitDistribution[]; generations: { generation: number; count: number }[]
  lineages: { id: number; count: number; meanGeneration: number }[]
  deaths: Pick<Totals, 'starvation' | 'ageing' | 'hazard'>; meanEnergyCost: number
}
export function analyzePopulation(organisms: readonly Organism[], founders: readonly DNA[], totals: Totals, temperature: number): PopulationAnalysis {
  const traits = traitKeys.filter(key => key !== 'hue').map(key => {
    const bounds = TRAITS[key], bins = new Array<number>(12).fill(0)
    let sum = 0, squares = 0, min = Infinity, max = -Infinity
    for (const o of organisms) {
      const value = o.dna[key]
      sum += value; squares += value * value; min = Math.min(min, value); max = Math.max(max, value)
      const index = Math.max(0, Math.min(bins.length - 1, Math.floor((value - bounds.min) / (bounds.max - bounds.min) * bins.length)))
      bins[index]++
    }
    const divisor = Math.max(1, organisms.length), mean = sum / divisor
    return { key, count: organisms.length, mean, founderMean: founders.length ? founders.reduce((total, dna) => total + dna[key], 0) / founders.length : null, min: organisms.length ? min : null, max: organisms.length ? max : null, deviation: Math.sqrt(Math.max(0, squares / divisor - mean * mean)), bins }
  })
  const generations = new Map<number, number>(), lineages = new Map<number, { id: number; count: number; totalGeneration: number }>()
  let totalCost = 0
  for (const o of organisms) {
    generations.set(o.generation, (generations.get(o.generation) ?? 0) + 1)
    const lineage = lineages.get(o.lineage) ?? { id: o.lineage, count: 0, totalGeneration: 0 }
    lineage.count++; lineage.totalGeneration += o.generation; lineages.set(o.lineage, lineage)
    totalCost += energyCost(o, temperature)
  }
  return {
    traits, generations: [...generations].map(([generation, count]) => ({ generation, count })).sort((a, b) => a.generation - b.generation),
    lineages: [...lineages.values()].sort((a, b) => b.count - a.count || a.id - b.id).slice(0, 6).map(item => ({ id: item.id, count: item.count, meanGeneration: item.totalGeneration / item.count })),
    deaths: { starvation: totals.starvation, ageing: totals.ageing, hazard: totals.hazard }, meanEnergyCost: totalCost / Math.max(1, organisms.length),
  }
}
