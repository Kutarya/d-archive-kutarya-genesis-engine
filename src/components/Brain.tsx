import { HIDDEN, INPUTS, OUTPUTS, WEIGHT_COUNT } from '../engine/types.ts'
import type { Organism } from '../engine/types.ts'
import { INPUT_LABELS, OUTPUT_LABELS } from '../engine/genetics.ts'
export function Brain({ organism }: { organism: Organism }) {
  const nodes = [organism.inputs, organism.hidden, organism.outputs], xs = [24, 144, 264], counts = [INPUTS, HIDDEN, OUTPUTS]
  const y = (layer: number, index: number) => 20 + index * 190 / Math.max(1, counts[layer] - 1)
  const links = []
  for (let layer = 0; layer < 2; layer++) for (let to = 0; to < counts[layer + 1]; to++) for (let from = 0; from < counts[layer]; from++) {
    const index = layer === 0 ? to * INPUTS + from : INPUTS * HIDDEN + HIDDEN + to * HIDDEN + from
    const weight = organism.dna.weights[index]
    links.push(<line key={`${layer}-${from}-${to}`} x1={xs[layer]} x2={xs[layer + 1]} y1={y(layer, from)} y2={y(layer + 1, to)} stroke={weight >= 0 ? '#75dabe' : '#ca859b'} strokeWidth={.3 + Math.abs(weight) * .65} opacity={.1 + Math.min(.35, Math.abs(weight) * .12)}><title>Ağırlık: {weight.toFixed(4)}</title></line>)
  }
  return <div className="brain-view"><div className="brain-meta"><span>12 GİRDİ</span><span>12 GİZLİ</span><span>3 ÇIKTI</span></div><svg viewBox="0 0 288 235" role="img" aria-label={`Canlı ${organism.id} gerçek sinir ağı ve anlık aktivasyonları`}><g>{links}</g>{nodes.flatMap((values, layer) => values.map((value, i) => <circle key={`${layer}-${i}`} cx={xs[layer]} cy={y(layer, i)} r={layer === 2 ? 6 : 4.3} fill={value >= 0 ? '#77ddc0' : '#d887a1'} fillOpacity={.2 + Math.abs(value) * .8} stroke="#bde3d7" strokeOpacity={.25}><title>{layer === 0 ? INPUT_LABELS[i] : layer === 2 ? OUTPUT_LABELS[i] : `Gizli ${i + 1}`} · aktivasyon {value.toFixed(4)}{layer > 0 ? ` · bias ${organism.dna.weights[layer === 1 ? INPUTS * HIDDEN + i : WEIGHT_COUNT - OUTPUTS + i].toFixed(3)}` : ''}</title></circle>))}</svg><div className="brain-key"><span><i />Pozitif bağ</span><span><i className="negative" />Negatif bağ</span></div><p>Çizgiler bu canlının kalıtsal ağırlıklarıdır. Düğüm parlaklığı anlık aktivasyondur.</p><div className="brain-outputs">{organism.outputs.map((v, i) => <div key={i}><span>{OUTPUT_LABELS[i]}</span><strong>{i === 1 ? v.toFixed(2) : `${Math.round((v + 1) * 50)}%`}</strong></div>)}</div><details className="sensor-list"><summary>Girdi görevleri ve değerleri</summary>{organism.inputs.map((v, i) => <div key={i}><span>{INPUT_LABELS[i]}</span><code>{v.toFixed(3)}</code></div>)}</details></div>
}
