import { DEFAULT_CONFIG } from '../engine/types.ts'
import type { WorldConfig } from '../engine/types.ts'
import type { Intervention, InterventionReceipt, InterventionTool } from '../engine/interventions.ts'
import type { World } from '../engine/world.ts'

export type GoalKey = 'inspect' | 'brain' | 'food' | 'population' | 'births'
interface Goal { key: GoalKey; label: string; target: number }
export interface ChallengeDefinition {
  id: string; title: string; subtitle: string; description: string; duration: number; instant: boolean
  config: WorldConfig; budget: Record<InterventionTool, number>; goals: Goal[]
}
export const CHALLENGES: readonly ChallengeDefinition[] = [
  { id: 'contact', title: 'İlk temas', subtitle: '01 · KEŞFET', description: 'Bir canlı seç, beynini incele ve dünyaya 24 besin bırak. Ekosistemin araçlarını öğren.', duration: 180, instant: true,
    config: { ...DEFAULT_CONFIG, seed: 'genesis-contact', width: 1400, height: 900, initialPopulation: 90, capacity: 200, foodCapacity: 450, foodRate: 16 }, budget: { food: 120, organism: 0, hazard: 0, erase: 0 },
    goals: [{ key: 'inspect', label: 'Bir canlıyı seç', target: 1 }, { key: 'brain', label: 'Gerçek sinir ağını aç', target: 1 }, { key: 'food', label: '24 besin bırak', target: 24 }] },
  { id: 'caretaker', title: 'Yaşamı koru', subtitle: '02 · BESLE', description: '48 ek besin bırak. 90 simülasyon saniyesi sonunda en az 40 canlı ve 8 doğum hedefle.', duration: 90, instant: false,
    config: { ...DEFAULT_CONFIG, seed: 'genesis-caretaker', width: 1400, height: 900, initialPopulation: 80, capacity: 220, foodCapacity: 600, foodRate: 14 }, budget: { food: 180, organism: 0, hazard: 0, erase: 3 },
    goals: [{ key: 'population', label: 'Sonunda 40 canlı', target: 40 }, { key: 'births', label: 'En az 8 gerçek doğum', target: 8 }, { key: 'food', label: 'En az 48 besin bırak', target: 48 }] },
  { id: 'balance', title: 'Kıtlık dengesi', subtitle: '03 · DENGE KUR', description: '32°C ve kıt kaynaklarda 72 ek besin bırak. 120 simülasyon saniyesi sonunda 25 canlı ve 40 doğum hedefle.', duration: 120, instant: false,
    config: { ...DEFAULT_CONFIG, seed: 'genesis-balance', width: 1400, height: 900, initialPopulation: 100, capacity: 220, foodCapacity: 350, foodRate: 6, temperature: 32 }, budget: { food: 144, organism: 0, hazard: 0, erase: 2 },
    goals: [{ key: 'population', label: 'Sonunda 25 canlı', target: 25 }, { key: 'births', label: 'En az 40 gerçek doğum', target: 40 }, { key: 'food', label: 'En az 72 besin bırak', target: 72 }] },
]
export interface ChallengeView {
  id: string; title: string; status: 'active' | 'complete' | 'failed'; elapsed: number; duration: number; instant: boolean
  remaining: Record<InterventionTool, number>; goals: (Goal & { value: number; achieved: boolean })[]
}
export class ChallengeSession {
  readonly definition: ChallengeDefinition
  private used: Record<InterventionTool, number> = { food: 0, organism: 0, hazard: 0, erase: 0 }
  private inspected = new Set<number>()
  private brains = new Set<number>()
  private status: ChallengeView['status'] = 'active'
  private initialBirths: number
  private started: number
  private finishedAt: number | null = null
  constructor(definition: ChallengeDefinition, world: World) { this.definition = definition; this.initialBirths = world.totals.births; this.started = world.time }
  get active() { return this.status === 'active' }
  restrict(action: Intervention): Intervention {
    if (!this.active) throw new Error('Görev sona erdi. Serbest keşfe geçin veya yeniden deneyin.')
    const remaining = this.definition.budget[action.tool] - this.used[action.tool]
    if (remaining <= 0) throw new Error('Bu araç için görev bütçesi kalmadı.')
    return { ...action, amount: action.tool === 'food' ? Math.min(action.amount ?? 12, remaining) : 1 }
  }
  record(receipt: InterventionReceipt) { if (this.active) this.used[receipt.tool] += receipt.count }
  observe(world: World, id: number | null, brain = false) {
    if (!this.active || id === null || !world.organisms.some(o => o.id === id)) return
    this.inspected.add(id); if (brain) this.brains.add(id)
  }
  private values(world: World): Record<GoalKey, number> { return { inspect: this.inspected.size, brain: this.brains.size, food: this.used.food, population: world.organisms.length, births: world.totals.births - this.initialBirths } }
  update(world: World) {
    if (!this.active) return
    const values = this.values(world), achieved = this.definition.goals.every(goal => values[goal.key] >= goal.target)
    if (this.definition.instant && achieved) this.status = 'complete'
    else if (world.time - this.started >= this.definition.duration) this.status = achieved ? 'complete' : 'failed'
    else if (world.organisms.length === 0) this.status = 'failed'
    if (!this.active) this.finishedAt = world.time
  }
  view(world: World): ChallengeView {
    const values = this.values(world)
    return { id: this.definition.id, title: this.definition.title, status: this.status, elapsed: (this.finishedAt ?? world.time) - this.started, duration: this.definition.duration, instant: this.definition.instant,
      remaining: { food: Math.max(0, this.definition.budget.food - this.used.food), organism: Math.max(0, this.definition.budget.organism - this.used.organism), hazard: Math.max(0, this.definition.budget.hazard - this.used.hazard), erase: Math.max(0, this.definition.budget.erase - this.used.erase) },
      goals: this.definition.goals.map(goal => ({ ...goal, value: values[goal.key], achieved: values[goal.key] >= goal.target })) }
  }
}
