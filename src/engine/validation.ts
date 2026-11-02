import { validateDNA } from './genetics.ts'
import { DEFAULT_CONFIG, energyCapacity, HIDDEN, INPUTS, MAX_HISTORY, OUTPUTS } from './types.ts'
import type { WorldConfig, WorldState } from './types.ts'

export const MAX_IMPORT_BYTES = 16 * 1024 * 1024
export function finite(value: unknown, min: number, max: number, name: string, integer = false): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value))) throw new Error(`${name}: geçersiz veya sınır dışında değer.`)
}
export function validateConfig(input: unknown): WorldConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Dünya ayarları geçersiz.')
  const c = input as WorldConfig
  if (Object.keys(c).some(key => !Object.hasOwn(DEFAULT_CONFIG, key))) throw new Error('Bilinmeyen dünya ayarı.')
  if (typeof c.seed !== 'string' || !c.seed.trim() || c.seed.length > 128) throw new Error('Seed 1–128 karakter olmalı.')
  finite(c.width, 600, 5000, 'Dünya genişliği'); finite(c.height, 400, 4000, 'Dünya yüksekliği')
  finite(c.capacity, 1, 2000, 'Nüfus kapasitesi', true); finite(c.initialPopulation, 0, c.capacity, 'Başlangıç nüfusu', true)
  finite(c.foodCapacity, 0, 4000, 'Besin kapasitesi', true); finite(c.foodRate, 0, 150, 'Besin yenilenmesi')
  finite(c.temperature, -5, 50, 'Sıcaklık'); finite(c.mutationRate, 0, 0.2, 'Mutasyon')
  finite(c.stepSeconds, 1 / 120, 1 / 20, 'Sabit adım')
  if (typeof c.reproductionEnabled !== 'boolean') throw new Error('Üreme ayarı geçersiz.')
  return { ...DEFAULT_CONFIG, ...c }
}
export function validateState(input: unknown): asserts input is WorldState {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Evren kaydı geçersiz.')
  const s = input as WorldState
  if (s.schemaVersion !== 1) throw new Error('Bu kayıt sürümü desteklenmiyor.')
  const c = validateConfig(s.config)
  finite(s.rngState, 0, 4294967295, 'RNG', true); finite(s.tick, 0, 1000000000, 'Adım', true)
  finite(s.nextId, 1, 4294967295, 'Sonraki kimlik', true); finite(s.nextFoodId, 1, 4294967295, 'Besin kimliği', true)
  finite(s.foodAccumulator, 0, 1.000001, 'Besin birikimi'); finite(s.nextSampleTick, s.tick, s.tick + 121, 'Örnekleme adımı', true)
  if (!Array.isArray(s.organisms) || s.organisms.length > c.capacity || !Array.isArray(s.food) || s.food.length > c.foodCapacity || !Array.isArray(s.hazards) || s.hazards.length > 32) throw new Error('Kayıt kapasitesi aşılıyor.')
  const ids = new Set<number>()
  for (const o of s.organisms) {
    if (!o || typeof o !== 'object') throw new Error('Canlı kaydı geçersiz.')
    validateDNA(o.dna)
    finite(o.id, 1, s.nextId - 1, 'Canlı kimliği', true)
    if (ids.has(o.id)) throw new Error('Tekrarlanan canlı kimliği.')
    ids.add(o.id)
    finite(o.x, 0, c.width, 'Konum X'); finite(o.y, 0, c.height, 'Konum Y')
    finite(o.heading, -Math.PI * 2, Math.PI * 2, 'Yön'); finite(o.speed, 0, o.dna.maxSpeed + 0.00001, 'Hız')
    finite(o.energy, 0.000001, energyCapacity(o.dna) + 0.00001, 'Enerji'); finite(o.age, 0, o.dna.longevity + c.stepSeconds, 'Yaş')
    finite(o.generation, 0, 1000000000, 'Nesil', true); finite(o.lineage, 1, o.id, 'Kurucu soy', true)
    if (!Array.isArray(o.parents) || o.parents.length > 2) throw new Error('Ebeveyn kaydı geçersiz.')
    for (const id of o.parents) finite(id, 1, o.id - 1, 'Ebeveyn kimliği', true)
    for (const field of ['eaten', 'children'] as const) finite(o[field], 0, 1000000000, field, true)
    finite(o.cooldown, 0, 10, 'Üreme bekleme'); finite(o.distance, 0, 1e12, 'Mesafe')
    for (const [values, length] of [[o.inputs, INPUTS], [o.hidden, HIDDEN], [o.outputs, OUTPUTS]] as const) {
      if (!Array.isArray(values) || values.length !== length) throw new Error('Aktivasyon boyutu geçersiz.')
      for (const value of values) finite(value, -1.000001, 1.000001, 'Nöron aktivasyonu')
    }
  }
  const foodIds = new Set<number>()
  for (const f of s.food) {
    if (!f || typeof f !== 'object' || Array.isArray(f)) throw new Error('Besin kaydı geçersiz.')
    finite(f.id, 1, s.nextFoodId - 1, 'Besin kimliği', true)
    if (foodIds.has(f.id)) throw new Error('Tekrarlanan besin kimliği.')
    foodIds.add(f.id)
    finite(f.x, 0, c.width, 'Besin X'); finite(f.y, 0, c.height, 'Besin Y'); finite(f.energy, 0.01, 50, 'Besin enerjisi')
  }
  for (const h of s.hazards) { if (!h || typeof h !== 'object' || Array.isArray(h)) throw new Error('Tehlike kaydı geçersiz.'); finite(h.x, 0, c.width, 'Tehlike X'); finite(h.y, 0, c.height, 'Tehlike Y'); finite(h.radius, 10, 250, 'Tehlike yarıçapı'); finite(h.intensity, 0, 2, 'Tehlike şiddeti') }
  if (!s.totals || typeof s.totals !== 'object') throw new Error('Toplamlar geçersiz.')
  for (const key of ['births', 'deaths', 'eaten', 'starvation', 'ageing', 'hazard'] as const) finite(s.totals[key], 0, 1e12, key, true)
  if (!Array.isArray(s.history) || s.history.length > MAX_HISTORY) throw new Error('Geçmiş boyutu geçersiz.')
  let lastTime = -1
  for (const entry of s.history) {
    if (!entry || typeof entry !== 'object') throw new Error('Geçmiş kaydı geçersiz.')
    for (const key of ['time', 'population', 'meanEnergy', 'meanGeneration', 'meanSpeed', 'meanSense', 'meanSize', 'diversity', 'births', 'deaths', 'food', 'lineages', 'eaten'] as const) finite(entry[key], 0, 1e12, `Geçmiş / ${key}`)
    if (!Number.isFinite(entry.time) || entry.time < lastTime || entry.time > s.tick * c.stepSeconds + 0.00001) throw new Error('Geçmiş zamanı geçersiz.')
    lastTime = entry.time
  }
  if (!Array.isArray(s.founders) || s.founders.length > 2000) throw new Error('Kurucu DNA boyutu geçersiz.')
  for (const dna of s.founders) validateDNA(dna)
}
export function parseWorldJSON(text: string): WorldState {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error('Dosya 16 MiB sınırını aşıyor.')
  let input: unknown
  try { input = JSON.parse(text) } catch { throw new Error('JSON dosyası okunamadı.') }
  validateState(input)
  return input
}
