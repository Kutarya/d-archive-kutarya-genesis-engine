import type { Statistics } from './types.ts'
const COLUMNS: [keyof Statistics, string][] = [
  ['time', 'simulasyon_saniyesi'], ['population', 'canli_sayisi'], ['meanEnergy', 'ortalama_enerji'],
  ['meanGeneration', 'ortalama_nesil'], ['meanSpeed', 'ortalama_hareket_hizi'], ['meanSense', 'ortalama_algilama'],
  ['meanSize', 'ortalama_boyut'], ['diversity', 'genetik_cesitlilik_0_1'], ['births', 'dogum'],
  ['deaths', 'olum'], ['food', 'besin'], ['lineages', 'yasayan_kurucu_soy'], ['eaten', 'tuketilen_besin'],
]
export function historyCSV(history: readonly Statistics[]): string {
  // Nokta ondalik ayraci ve virgul sutun ayraci; her satir gercek bir simulasyon ornegi.
  return [COLUMNS.map(([, label]) => label).join(','), ...history.map(sample => COLUMNS.map(([key]) => Number.isFinite(sample[key]) ? String(sample[key]) : '').join(','))].join('\r\n')
}
