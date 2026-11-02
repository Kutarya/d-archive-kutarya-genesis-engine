import { useState } from 'react'
import { ChevronDown, Map } from 'lucide-react'
import { STRIDE } from '../engine/types.ts'
import type { Frame } from '../engine/types.ts'
import type { Viewport } from '../render/WorldRenderer.ts'
export function MiniMap({ frame, viewport, navigate }: { frame: Frame | null; viewport: Viewport | null; navigate: (x: number, y: number) => void }) {
  const [open, setOpen] = useState(true)
  if (!frame) return null
  const step = Math.max(1, Math.ceil(frame.ids.length / 120)), foodStep = Math.max(1, Math.ceil(frame.food.length / 2 / 50))
  const agents = [], food = []
  for (let i = 0; i < frame.ids.length; i += step) agents.push(<circle key={frame.ids[i]} cx={frame.agents[i * STRIDE]} cy={frame.agents[i * STRIDE + 1]} r={8} fill="#81a869" />)
  for (let i = 0; i < frame.food.length / 2; i += foodStep) food.push(<circle key={i} cx={frame.food[i * 2]} cy={frame.food[i * 2 + 1]} r={6} fill="#d7b06a" opacity={.65} />)
  return <div className="mini-map"><button aria-label={open ? 'Mini haritayı küçült' : 'Mini haritayı aç'} onClick={() => setOpen(!open)}><Map size={11} /><span>EVREN HARİTASI</span><ChevronDown size={12} className={open ? '' : 'rotated'} /></button>{open && <svg viewBox={`0 0 ${frame.width} ${frame.height}`} preserveAspectRatio="none" role="button" tabIndex={0} aria-label="Mini harita: kamerayı taşı" onPointerDown={e => { e.preventDefault(); const box = e.currentTarget.getBoundingClientRect(); navigate((e.clientX - box.left) / box.width * frame.width, (e.clientY - box.top) / box.height * frame.height) }} onKeyDown={e => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); navigate(frame.width / 2, frame.height / 2) } }}>
    <rect width={frame.width} height={frame.height} fill="#f2f5e4" />{Array.from({ length: frame.hazards.length / 4 }, (_, i) => <circle key={i} cx={frame.hazards[i * 4]} cy={frame.hazards[i * 4 + 1]} r={frame.hazards[i * 4 + 2]} fill="#cc927c40" />)}{food}{agents}{frame.selected && <circle cx={frame.selected.x} cy={frame.selected.y} r={21} fill="#bc8559" />}{viewport && <rect data-testid="map-viewport" x={viewport.x} y={viewport.y} width={viewport.width} height={viewport.height} fill="#95af7420" stroke="#88a46a" strokeWidth={frame.width / 140} />}
  </svg>}{open && <small>Dokun: kamerayı taşı · örneklenmiş görünüm</small>}</div>
}
