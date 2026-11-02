import { Random } from './random.ts'
import { clamp, HIDDEN, INPUTS, OUTPUTS, WEIGHT_COUNT } from './types.ts'
import type { DNA, Trait } from './types.ts'

export const TRAITS: Record<Trait, { min: number; max: number; label: string; unit: string }> = {
  maxSpeed: { min: 24, max: 140, label: 'Azami hız', unit: 'birim/sn' },
  senseRadius: { min: 40, max: 240, label: 'Algılama', unit: 'birim' },
  size: { min: 3, max: 10, label: 'Vücut boyutu', unit: 'birim' },
  efficiency: { min: 0.6, max: 1.6, label: 'Metabolik verim', unit: '×' },
  reproductionThreshold: { min: 0.58, max: 0.94, label: 'Üreme eşiği', unit: 'oran' },
  movementCost: { min: 0.01, max: 0.04, label: 'Hareket maliyeti', unit: 'katsayı' },
  longevity: { min: 75, max: 220, label: 'Ömür sınırı', unit: 'sn' },
  hue: { min: 0, max: 360, label: 'Soy rengi', unit: '°' },
}
export const traitKeys = Object.keys(TRAITS) as Trait[]
export function createDNA(rng: Random): DNA {
  const weights = new Array<number>(WEIGHT_COUNT)
  for (let i = 0; i < weights.length; i++) weights[i] = rng.normal() * 0.42
  return {
    maxSpeed: rng.range(35, 110), senseRadius: rng.range(70, 200), size: rng.range(3.8, 7.5),
    efficiency: rng.range(0.8, 1.4), reproductionThreshold: rng.range(0.62, 0.86),
    movementCost: rng.range(0.014, 0.033), longevity: rng.range(110, 210), hue: rng.range(120, 330), weights,
  }
}
export function copyDNA(dna: DNA): DNA { return { ...dna, weights: [...dna.weights] } }
export function mutateDNA(dna: DNA, rng: Random, rate: number): DNA {
  if (!Number.isFinite(rate) || rate < 0 || rate > 0.2) throw new Error('Mutasyon oranı 0–0,2 arasında olmalı.')
  const child = copyDNA(dna)
  if (rate === 0) return child
  for (const key of traitKeys) {
    if (rng.next() >= rate) continue
    const bounds = TRAITS[key], scale = rng.next() < 0.02 ? 0.18 : 0.025
    child[key] = clamp(child[key] + rng.normal() * (bounds.max - bounds.min) * scale, bounds.min, bounds.max)
  }
  for (let i = 0; i < child.weights.length; i++) {
    if (rng.next() < rate) child.weights[i] = clamp(child.weights[i] + rng.normal() * (rng.next() < 0.02 ? 0.4 : 0.09), -3, 3)
  }
  return child
}
export function validateDNA(value: unknown): asserts value is DNA {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('DNA nesnesi geçersiz.')
  const dna = value as DNA
  for (const key of traitKeys) {
    const bounds = TRAITS[key]
    if (typeof dna[key] !== 'number' || !Number.isFinite(dna[key]) || dna[key] < bounds.min || dna[key] > bounds.max) throw new Error(`DNA sınırı geçersiz: ${key}`)
  }
  if (!Array.isArray(dna.weights) || dna.weights.length !== WEIGHT_COUNT || dna.weights.some(v => typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 3)) throw new Error('Sinir ağı ağırlıkları geçersiz.')
}
export function forward(weights: readonly number[], inputs: readonly number[], hidden: number[], outputs: number[]) {
  if (weights.length !== WEIGHT_COUNT || inputs.length !== INPUTS) throw new Error('Sinir ağı boyutları uyuşmuyor.')
  let offset = 0
  for (let h = 0; h < HIDDEN; h++) {
    let sum = weights[INPUTS * HIDDEN + h]
    for (let i = 0; i < INPUTS; i++) sum += weights[offset++] * (Number.isFinite(inputs[i]) ? clamp(inputs[i], -1, 1) : 0)
    hidden[h] = Number.isFinite(sum) ? Math.tanh(sum) : 0
  }
  offset = INPUTS * HIDDEN + HIDDEN
  for (let o = 0; o < OUTPUTS; o++) {
    let sum = weights[WEIGHT_COUNT - OUTPUTS + o]
    for (let h = 0; h < HIDDEN; h++) sum += weights[offset++] * hidden[h]
    outputs[o] = Number.isFinite(sum) ? Math.tanh(sum) : 0
  }
}
export const INPUT_LABELS = ['Besin / ileri', 'Besin / yan', 'Besin yakınlığı', 'Enerji oranı', 'Hız oranı', 'Canlı yoğunluğu', 'Tehlike / ileri', 'Tehlike / yan', 'Tehlike şiddeti', 'Sıcaklık stresi', 'Sınır / ileri', 'Sınır / yan']
export const OUTPUT_LABELS = ['İtki', 'Dönüş', 'Üreme isteği']
