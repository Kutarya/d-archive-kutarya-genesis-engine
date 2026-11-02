import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../engine/types.ts'
import { World } from '../engine/world.ts'
import { deleteWorld, listWorlds, loadWorld, saveWorld } from './worlds.ts'
it('IndexedDB kaydı kalıcı durum/RNG/DNA ve devamını korur', async () => {
  const world = new World({ ...DEFAULT_CONFIG, initialPopulation: 4 }); world.step(41)
  const record = await saveWorld('Deney evreni', world.exportState())
  expect((await listWorlds()).some(row => row.id === record.id)).toBe(true)
  const restored = World.fromState(await loadWorld(record.id)); world.step(71); restored.step(71)
  expect(restored.exportState()).toEqual(world.exportState())
  await deleteWorld(record.id); await expect(loadWorld(record.id)).rejects.toThrow('bulunamadı')
})
it('bozuk kayıt ve boş ad depolanmaz', async () => {
  const state = new World({ ...DEFAULT_CONFIG, initialPopulation: 1 }).exportState()
  await expect(saveWorld('  ', state)).rejects.toThrow()
  state.organisms[0].energy = Infinity
  await expect(saveWorld('Bozuk', state)).rejects.toThrow()
})
