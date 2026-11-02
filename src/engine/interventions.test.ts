import { expect, it } from 'vitest'
import { intervene } from './interventions.ts'
import { DEFAULT_CONFIG } from './types.ts'
import { World } from './world.ts'

it('besin fırçası gerçek besinleri daireye yerleştirir ve kapasiteyi sayar', () => {
  const world = new World({ ...DEFAULT_CONFIG, initialPopulation: 0, foodCapacity: 40 })
  world.food = []
  expect(intervene(world, { tool: 'food', x: 200, y: 300, radius: 48 }).count).toBe(12)
  expect(world.food.every(f => Math.hypot(f.x - 200, f.y - 300) <= 48)).toBe(true)
  for (let i = 0; i < 2; i++) intervene(world, { tool: 'food', x: 1, y: 1, radius: 160 })
  expect(intervene(world, { tool: 'food', x: 20, y: 20 }).count).toBe(4)
  expect(intervene(world, { tool: 'food', x: 20, y: 20 }).count).toBe(0)
  expect(world.food.every(f => f.x >= 0 && f.y >= 0)).toBe(true)
})
it('eski yarıçapsız besin komutu aynı RNG/durum akışını korur', () => {
  const a = new World({ ...DEFAULT_CONFIG, initialPopulation: 0, foodCapacity: 100 }), b = World.fromState(a.exportState())
  intervene(a, { tool: 'food', x: 500, y: 300 })
  for (let i = 0; i < 12; i++) b.addFood(500 + b.rng.range(-20, 20), 300 + b.rng.range(-20, 20))
  expect(a.exportState()).toEqual(b.exportState())
})
it('temizleme en yakın tek tehlikeyi kaldırır; boş alan no-op olur', () => {
  const world = new World({ ...DEFAULT_CONFIG, initialPopulation: 0 }); world.hazards = []
  world.addHazard(200, 200, 60); world.addHazard(220, 200, 60)
  const before = world.exportState()
  expect(intervene(world, { tool: 'erase', x: 900, y: 900 }).count).toBe(0)
  expect(world.exportState()).toEqual(before)
  expect(intervene(world, { tool: 'erase', x: 200, y: 200 }).count).toBe(1)
  expect(world.hazards).toHaveLength(1); expect(world.hazards[0].x).toBe(220)
})
it('geçersiz araç/fırça/konum dünyayı veya RNG yi değiştirmez', () => {
  const world = new World({ ...DEFAULT_CONFIG, initialPopulation: 0 }), before = world.exportState()
  for (const action of [
    { tool: 'food' as const, x: NaN, y: 20 }, { tool: 'food' as const, x: 20, y: 20, radius: Infinity },
    { tool: 'food' as const, x: 20, y: 20, amount: 13 }, { tool: 'bad' as 'food', x: 20, y: 20 },
  ]) expect(() => intervene(world, action)).toThrow()
  expect(world.exportState()).toEqual(before)
})
