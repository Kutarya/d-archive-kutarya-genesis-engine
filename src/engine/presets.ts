import type { WorldConfig } from './types.ts'
export const PRESETS = [
  { id: 'balanced', label: 'Dengeli laboratuvar', description: '22°C · 24 besin/sn. Başlangıç için dengeli kaynak koşulları.', settings: { temperature: 22, foodCapacity: 1000, foodRate: 24, mutationRate: .035 } },
  { id: 'abundant', label: 'Besince zengin', description: '22°C · 45 besin/sn. Kaynak bolluğunda enerji ve üreme ödünleşimini gözle.', settings: { temperature: 22, foodCapacity: 1600, foodRate: 45, mutationRate: .035 } },
  { id: 'scarcity', label: 'Sıcak ve kıt', description: '32°C · 6 besin/sn. Düşük kaynak ve sıcaklık stresi birlikte uygulanır.', settings: { temperature: 32, foodCapacity: 350, foodRate: 6, mutationRate: .035 } },
  { id: 'cold', label: 'Soğuk çevre', description: '4°C · 15 besin/sn. Soğuğun gerçek metabolizma maliyetini gözle.', settings: { temperature: 4, foodCapacity: 800, foodRate: 15, mutationRate: .035 } },
] as const
export type PresetId = typeof PRESETS[number]['id']
export function applyPreset(config: WorldConfig, id: PresetId): WorldConfig {
  const preset = PRESETS.find(item => item.id === id)
  if (!preset) throw new Error('Çevre senaryosu bulunamadı.')
  return { ...config, ...preset.settings }
}
