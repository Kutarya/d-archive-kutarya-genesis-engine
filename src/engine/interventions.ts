import { clamp } from './types.ts'
import { finite } from './validation.ts'
import type { World } from './world.ts'

export type InterventionTool = 'food' | 'organism' | 'hazard' | 'erase'
export interface Intervention { tool: InterventionTool; x: number; y: number; radius?: number; amount?: number }
export interface InterventionReceipt { tool: InterventionTool; count: number; selectedId?: number }
export function intervene(world: World, action: Intervention): InterventionReceipt {
  finite(action.x, 0, world.config.width, 'Müdahale X'); finite(action.y, 0, world.config.height, 'Müdahale Y')
  if (action.radius !== undefined) finite(action.radius, 12, 180, 'Fırça yarıçapı')
  if (action.amount !== undefined) finite(action.amount, 1, 12, 'Müdahale miktarı', true)
  if (action.tool === 'food') {
    const before = world.food.length, amount = Math.min(action.amount ?? 12, world.config.foodCapacity - before)
    for (let i = 0; i < amount; i++) {
      let x: number, y: number
      if (action.radius === undefined) { x = action.x + world.rng.range(-20, 20); y = action.y + world.rng.range(-20, 20) }
      else { const angle = world.rng.range(-Math.PI, Math.PI), distance = Math.sqrt(world.rng.next()) * action.radius; x = action.x + Math.cos(angle) * distance; y = action.y + Math.sin(angle) * distance }
      world.addFood(clamp(x, 0, world.config.width), clamp(y, 0, world.config.height))
    }
    return { tool: action.tool, count: world.food.length - before }
  }
  if (action.tool === 'organism') return { tool: action.tool, count: 1, selectedId: world.addOrganism(action.x, action.y) }
  if (action.tool === 'hazard') { world.addHazard(action.x, action.y, action.radius ?? 80); return { tool: action.tool, count: 1 } }
  if (action.tool !== 'erase') throw new Error('Müdahale aracı geçersiz.')
  let index = -1, distance = Infinity
  for (let i = 0; i < world.hazards.length; i++) {
    const h = world.hazards[i], d = Math.hypot(h.x - action.x, h.y - action.y)
    if (d <= h.radius + (action.radius ?? 32) && d < distance) { index = i; distance = d }
  }
  if (index >= 0) world.hazards.splice(index, 1)
  return { tool: action.tool, count: index >= 0 ? 1 : 0 }
}
