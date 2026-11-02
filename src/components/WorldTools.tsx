import { Atom, Eraser, HelpCircle, Leaf, Maximize2, MousePointer2, Pause, Play, TriangleAlert } from 'lucide-react'
import type { Tool } from '../worker/protocol.ts'
import type { ChallengeView } from '../game/challenges.ts'
import { GardenRunLabel } from './Garden.tsx'
const TOOLS = [
  { tool: 'select', label: 'Seç', aria: 'Dünya aracı: Canlı seç', icon: MousePointer2 },
  { tool: 'food', label: 'Besle', aria: 'Dünya aracı: Besin fırçası', icon: Leaf },
  { tool: 'organism', label: 'Canlı', aria: 'Dünya aracı: Canlı ekle', icon: Atom },
  { tool: 'hazard', label: 'Tehlike', aria: 'Dünya aracı: Tehlike ekle', icon: TriangleAlert },
  { tool: 'erase', label: 'Temizle', aria: 'Dünya aracı: Tehlike temizle', icon: Eraser },
] as const
export function WorldTools({ tool, choose, radius, brush, running, speed, run, changeSpeed, focused, focus, help, challenge, simple = false }: {
  tool: Tool; choose: (tool: Tool) => void; radius: number; brush: (radius: number) => void
  running: boolean; speed: number; run: () => void; changeSpeed: (speed: number) => void
  focused: boolean; focus: () => void; help: () => void; challenge?: ChallengeView | null; simple?: boolean
}) {
  return <div className="world-tools" role="toolbar" aria-label="Dünya araçları">
    <div className="tool-palette">{TOOLS.map(({ tool: key, label, aria, icon: Icon }, index) => {
      const disabled = key !== 'select' && !!challenge && (!challenge.remaining[key] || challenge.status !== 'active')
      if (simple && key === 'hazard') return null
      return <button key={key} aria-label={aria} aria-pressed={tool === key} disabled={disabled} title={disabled ? 'Bu görevde bütçe yok veya görev sona erdi.' : `${label} · ${index + 1}`} className={`${tool === key ? 'chosen ' : ''}tool-${key}`} onClick={() => choose(key)}><Icon size={simple ? 23 : 18} /><span>{simple && key === 'select' ? 'Dost seç' : simple && key === 'organism' ? 'Dost ekle' : label}</span><kbd>{index + 1}</kbd></button>
    })}</div>
    <div className="world-playback"><button aria-label={running ? 'Akışı duraklat' : 'Akışı sürdür'} disabled={!!challenge && challenge.status !== 'active'} className="playback-button" onClick={run}>{simple ? <GardenRunLabel running={running} /> : running ? <Pause size={18} /> : <Play size={18} />}</button><button className="quick-speed" aria-label="Hızı sıradaki kademeye getir" onClick={() => changeSpeed(speed >= 8 ? 1 : speed < 1 ? 1 : speed * 2)}>{speed}×</button><button aria-label={focused ? 'Odak görünümünü kapat' : 'Odak görünümünü aç'} title="Daha büyük dünya görünümü" onClick={focus}><Maximize2 size={19} /></button><button aria-label="Kullanım kılavuzu" title="Kontroller ve keşif rehberi" onClick={help}><HelpCircle size={19} /></button></div>
    {tool !== 'select' && tool !== 'organism' && <label className="brush-control">{tool === 'food' ? 'Besin fırçası' : tool === 'hazard' ? 'Tehlike yarıçapı' : 'Temizleme erişimi'}<input aria-label="Araç yarıçapı" type="range" min={16} max={160} step={8} value={radius} onChange={e => brush(Number(e.target.value))} /><strong>{radius} b</strong><span>{tool === 'food' ? 'Sürükleyerek besin bırak' : 'Uygulamak için dünyaya dokun'}</span></label>}
  </div>
}
