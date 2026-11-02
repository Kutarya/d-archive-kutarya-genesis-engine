import { memo, useId, useMemo } from 'react'
import type { Statistics } from '../engine/types.ts'
export const Chart = memo(function Chart({ title, data, field, second, unit = '', color = '#659957', multiplier = 1 }: { title: string; data: Statistics[]; field: keyof Statistics; second?: keyof Statistics; unit?: string; color?: string; multiplier?: number }) {
  const id = useId().replaceAll(':', '')
  const points = useMemo(() => {
    const samples = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 100)) === 0 || i === data.length - 1)
    const values = samples.flatMap(s => [s[field], second ? s[second] : s[field]])
    const max = Math.max(1, ...values), min = Math.min(0, ...values)
    const path = (key: keyof Statistics) => samples.map((s, i) => `${i ? 'L' : 'M'}${(i / Math.max(1, samples.length - 1) * 260).toFixed(2)},${(52 - (s[key] - min) / (max - min) * 45).toFixed(2)}`).join(' ')
    return { line: path(field), other: second ? path(second) : null }
  }, [data, field, second])
  const value = (data.at(-1)?.[field] ?? 0) * multiplier
  return <article className="metric-chart"><div><span>{title}</span><strong>{value.toLocaleString('tr-TR', { maximumFractionDigits: field === 'population' || field === 'births' ? 0 : 1 })}<small>{unit}</small></strong></div><svg viewBox="0 0 260 58" preserveAspectRatio="none" role="img" aria-label={`${title} zaman çizelgesi`}><defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".18" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>{points.line && <path d={`${points.line} L260,58 L0,58 Z`} fill={`url(#${id})`} />}<path d="M0,52 H260" stroke="#ffffff0c" /><path d={points.line} fill="none" stroke={color} strokeWidth="1.8" />{points.other && <path d={points.other} fill="none" stroke="#cc8393" strokeWidth="1.4" />}</svg>{second && <small className="chart-legend">Yeşil: doğum · kırmızı: ölüm</small>}</article>
})
