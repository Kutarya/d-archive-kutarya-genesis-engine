import { mkdir, writeFile } from 'node:fs/promises'
import { selectionExperiment } from '../src/engine/evaluation.ts'
const seeds = process.argv.slice(2).length ? process.argv.slice(2) : ['genesis-a', 'genesis-b', 'genesis-c']
const started = performance.now(), experiments = []
for (const seed of seeds) {
  const result = selectionExperiment(seed)
  experiments.push(result)
  console.log(JSON.stringify({ seed, births: result.births, generation: result.maxGeneration, population: result.finalPopulation, survivalDelta: result.comparisons.map(x => Number(x.survivalDelta.toFixed(3))), foodDelta: result.comparisons.map(x => Number(x.foodDelta.toFixed(3))) }))
}
const pairs = experiments.flatMap(e => e.comparisons)
const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length
const survivalChange = mean(pairs.map(p => p.survivalDelta)), foodChange = mean(pairs.map(p => p.foodDelta))
const report = { at: new Date().toISOString(), methodology: '120 sn doğal ekosistem; yaşayan gen havuzu ile kurucu gen havuzundan eşit 40 canlı; her çift aynı ortam seed ve başlangıç noktalarında 60 sn; değerlendirmede üreme kapalı. Ölüm sonrası enerji sıfır sayılır. Elle başarı politikası veya nesle bağlı davranış kuralı yok.', experiments, meanBaselineSurvival: mean(pairs.map(p => p.baseline.survivalSeconds)), meanSelectedSurvival: mean(pairs.map(p => p.selected.survivalSeconds)), meanSurvivalDelta: survivalChange, meanFoodDelta: foodChange, improvedInBothMetrics: survivalChange > 0 && foodChange > 0, elapsedSeconds: (performance.now() - started) / 1000, statisticalSignificanceClaimed: false }
await mkdir('reports', { recursive: true })
await writeFile('reports/evolution.json', JSON.stringify(report, null, 2))
await writeFile('reports/EVRIM-SONUCU.md', `# Kontrollü seçilim deneyi\n\n${seeds.length} eğitim tohumu, ${pairs.length} eşlenmiş değerlendirme.\n\nKurucu ortalama hayatta kalma: ${report.meanBaselineSurvival.toFixed(3)} sn.\n\nSeçilmiş ortalama hayatta kalma: ${report.meanSelectedSurvival.toFixed(3)} sn.\n\nHayatta kalma farkı: ${survivalChange.toFixed(3)} sn; canlı başına besin farkı: ${foodChange.toFixed(3)}.\n\n${report.improvedInBothMetrics ? 'Bu koşuda iki ölçüm de arttı.' : 'Bu koşuda iki ölçümün birlikte arttığı gösterilemedi; bu sonuç başarılı evrim kanıtı olarak sunulmaz.'}\n\n${report.methodology}\n\nGen havuzu sağ kalan bireylerden alınır; bu hem kalıtsal seçilimi hem son koşullara sağkalım seçimini kapsar. Yaş/enerji sıfırlanan kontrollü değerlendirme bunun sadece mevcut yaş avantajı olmasını engeller. Üç tohum istatistiksel anlamlılık veya bütün ortamlara genelleme sağlamaz.\n`)
console.log(JSON.stringify({ meanSurvivalDelta: survivalChange, meanFoodDelta: foodChange, improvedInBothMetrics: report.improvedInBothMetrics, seconds: report.elapsedSeconds }))
