import { mkdir, writeFile } from 'node:fs/promises'
import { CHALLENGES, ChallengeSession } from '../src/game/challenges.ts'
import { intervene } from '../src/engine/interventions.ts'
import { World } from '../src/engine/world.ts'
const results = []
for (const definition of CHALLENGES.filter(d => !d.instant)) {
  for (const assisted of [false, true]) {
    const world = new World(definition.config), session = new ChallengeSession(definition, world)
    for (let second = 0; second < definition.duration; second++) {
      if (assisted && second % (definition.id === 'caretaker' ? 6 : 10) === 0 && world.organisms.length && session.view(world).remaining.food > 0) {
        const organism = world.organisms.reduce((weakest, o) => o.energy < weakest.energy ? o : weakest)
        session.record(intervene(world, session.restrict({ tool: 'food', x: organism.x, y: organism.y, radius: 32 })))
      }
      world.step(60); session.update(world)
      if (!session.active) break
    }
    const result = { challenge: definition.id, assisted, finalPopulation: world.organisms.length, births: world.totals.births, foodAdded: definition.budget.food - session.view(world).remaining.food, status: session.view(world).status, goals: session.view(world).goals }
    results.push(result); console.log(JSON.stringify(result))
  }
}
await mkdir('reports', { recursive: true }); await writeFile('reports/challenge-pilot-1.2.json', JSON.stringify({ runtime: process.version, method: 'Gerçek motor; her 6/10 simülasyon saniyesinde en düşük enerjili canlı yakınında 12 besin. Ağ/DNA değişikliği veya zorunlu başarı yok. Node pilotu browser veya bütün oyuncular için garanti değildir.', results }, null, 2))
