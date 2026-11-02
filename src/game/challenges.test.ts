import { expect, it } from 'vitest'
import { CHALLENGES, ChallengeSession } from './challenges.ts'
import { intervene } from '../engine/interventions.ts'
import { validateConfig } from '../engine/validation.ts'
import { World } from '../engine/world.ts'

it('her görev gerçek ve sınırlandırılmış bir dünya oluşturur', () => {
  for (const mission of CHALLENGES) {
    validateConfig(mission.config)
    const world = new World(mission.config)
    expect(world.organisms).toHaveLength(mission.config.initialPopulation)
    expect(mission.goals.length).toBeGreaterThan(0)
    expect(new ChallengeSession(mission, world).view(world).status).toBe('active')
  }
})
it('gözlem yalnız mevcut canlılar için sayılır ve DNA/RNG değiştirmez', () => {
  const mission = CHALLENGES[0], world = new World(mission.config), session = new ChallengeSession(mission, world)
  const before = world.exportState()
  session.observe(world, 999999, true); session.update(world)
  expect(session.view(world).goals[0].value).toBe(0)
  session.observe(world, world.organisms[0].id, true); session.update(world)
  expect(session.view(world).goals[0].value).toBe(1); expect(session.view(world).goals[1].value).toBe(1)
  expect(world.exportState()).toEqual(before)
})
it('ilk temas gerçek gözlem ve teslim edilmiş besinle tamamlanır', () => {
  const mission = CHALLENGES[0], world = new World(mission.config), session = new ChallengeSession(mission, world)
  session.observe(world, world.organisms[0].id, true)
  for (let i = 0; i < 2; i++) session.record(intervene(world, session.restrict({ tool: 'food', x: 500, y: 300, radius: 32 })))
  session.update(world)
  const view = session.view(world)
  expect(view.status).toBe('complete'); expect(view.goals.every(g => g.achieved)).toBe(true)
  expect(view.remaining.food).toBe(96)
  expect(() => session.restrict({ tool: 'food', x: 10, y: 20 })).toThrow()
})
it('başarısız veya kapasitede kalan müdahale bütçeyi harcamaz', () => {
  const mission = CHALLENGES[0], world = new World(mission.config), session = new ChallengeSession(mission, world)
  while (world.food.length < world.config.foodCapacity) world.addFood()
  session.record(intervene(world, session.restrict({ tool: 'food', x: 500, y: 300 })))
  expect(session.view(world).remaining.food).toBe(120)
  expect(() => session.restrict({ tool: 'organism', x: 500, y: 300 })).toThrow()
})
it('bütçe gerçek yerleştirmelerle sıfıra iner ve aşılmaz', () => {
  const mission = CHALLENGES[1], world = new World(mission.config), session = new ChallengeSession(mission, world)
  for (let i = 0; i < 15; i++) session.record(intervene(world, session.restrict({ tool: 'food', x: 500, y: 300 })))
  expect(session.view(world).remaining.food).toBe(0)
  expect(() => session.restrict({ tool: 'food', x: 500, y: 300 })).toThrow()
})
it('zamanlı hedef süre öncesinde bitmez ve tükenmiş ekosistem başarısız olur', () => {
  const mission = { ...CHALLENGES[1], duration: 2, goals: [{ key: 'population' as const, label: 'Bir canlı', target: 1 }] }
  const world = new World(mission.config), session = new ChallengeSession(mission, world)
  session.update(world); expect(session.view(world).status).toBe('active')
  world.step(120); session.update(world); expect(session.view(world).status).toBe('complete')
  const finished = session.view(world).elapsed; world.step(60); expect(session.view(world).elapsed).toBe(finished)
  const empty = new World({ ...mission.config, initialPopulation: 0 }), failed = new ChallengeSession(mission, empty)
  failed.update(empty); expect(failed.view(empty).status).toBe('failed')
})
