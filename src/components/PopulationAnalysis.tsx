import { useState } from 'react'
import { TRAITS } from '../engine/genetics.ts'
import type { PopulationAnalysis as Analysis } from '../engine/analysis.ts'
import type { Trait } from '../engine/types.ts'
const n = (value: number, decimals = 2) => value.toLocaleString('tr-TR', { maximumFractionDigits: decimals })
export function PopulationAnalysis({ data, population }: { data?: Analysis; population: number }) {
  const [trait, setTrait] = useState<Trait>('maxSpeed')
  if (!data) return <p className="quiet">Popülasyon analizi hazırlanıyor…</p>
  const distribution = data.traits.find(t => t.key === trait)!, bounds = TRAITS[trait]
  const decimals = trait === 'movementCost' ? 4 : 2
  const maximum = Math.max(1, ...distribution.bins)
  const observedPopulation = data.traits[0]?.count ?? population
  const founder = distribution.founderMean
  const founderX = founder === null ? null : (founder - bounds.min) / (bounds.max - bounds.min) * 228 + 6
  const maxGeneration = Math.max(1, ...data.generations.map(g => g.count))
  return <div className="population-analysis">
    <h3>Genetik iz</h3><label className="trait-choice">Gözlenen özellik<select aria-label="Gen dağılımı özelliği" value={trait} onChange={e => setTrait(e.target.value as Trait)}>{data.traits.map(item => <option key={item.key} value={item.key}>{TRAITS[item.key].label}</option>)}</select></label>
    <svg className="trait-histogram" viewBox="0 0 240 88" role="img" aria-label={`${bounds.label} gerçek popülasyon dağılımı`}>
      {distribution.bins.map((count, i) => <rect key={i} x={6 + i * 19} y={76 - count / maximum * 64} width={15} height={count / maximum * 64} rx={2} fill="#76b7a0"><title>{n(bounds.min + i / 12 * (bounds.max - bounds.min), decimals)}–{n(bounds.min + (i + 1) / 12 * (bounds.max - bounds.min), decimals)}: {count} canlı</title></rect>)}
      <line x1="6" y1="76" x2="234" y2="76" stroke="#355147" />{founderX !== null && <line x1={founderX} x2={founderX} y1="5" y2="76" stroke="#d8bc83" strokeDasharray="3 3"><title>Kurucu ortalaması: {n(founder!, decimals)}</title></line>}
    </svg><div className="histogram-scale"><span>{n(bounds.min, decimals)} {bounds.unit}</span><span>{n(bounds.max, decimals)} {bounds.unit}</span></div>
    <div className="distribution-facts"><div><span>Yaşayan ort.</span><strong data-testid="trait-mean">{distribution.count ? n(distribution.mean, decimals) : '—'}</strong></div><div><span>Kurucu ort.</span><strong>{founder === null ? '—' : n(founder, decimals)}</strong></div><div><span>Standart sapma</span><strong>{distribution.count ? n(distribution.deviation, decimals) : '—'}</strong></div></div>
    <p className="quiet">Son örnek: {observedPopulation} canlı · 1 Hz analiz. Kesik çizgi başlangıç kurucu ortalamasıdır. Gen farkı tek başına başarı kanıtı değildir.</p>
    <details className="cohort-details"><summary>Nesiller ve baskın soylar</summary><div className="generation-bars">{data.generations.map(g => <div key={g.generation}><span>{g.generation}. nesil</span><i style={{ width: `${g.count / maxGeneration * 70}%` }} /><strong>{g.count}</strong></div>)}</div><div className="lineage-list">{data.lineages.map(item => <div key={item.id}><span>Soy #{item.id}</span><strong>{item.count} · {n(item.count / Math.max(1, observedPopulation) * 100, 1)}%</strong></div>)}</div><p className="quiet">Soy kimliği kurucu ebeveynin izidir; tür sınıflaması değildir.</p></details>
    <div className="death-causes"><h4>Ölüm nedenleri</h4><div><span>Açlık / geçersiz enerji</span><strong>{n(data.deaths.starvation, 0)}</strong></div><div><span>Yaşlanma</span><strong>{n(data.deaths.ageing, 0)}</strong></div><div><span>Tehlike bölgesinde enerji tükenmesi</span><strong>{n(data.deaths.hazard, 0)}</strong></div><p className="quiet">Son grupta tehlike dışındaki metabolizma bedeli de etkili olabilir.</p></div>
  </div>
}
