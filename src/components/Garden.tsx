import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowRight, Check, Dna, Focus, Heart, Leaf, MousePointer2, Pause, Play, Sparkles, Sprout, Sun, X } from 'lucide-react'
import { energyCapacity, STRIDE } from '../engine/types.ts'
import type { Frame } from '../engine/types.ts'
import type { Tool } from '../worker/protocol.ts'
import type { ChallengeView } from '../game/challenges.ts'

export function GardenCreature({ color = 'green', small = false, hue }: { color?: string; small?: boolean; hue?: number }) {
  return <span aria-hidden="true" className={`garden-creature creature-${color} ${small ? 'creature-small' : ''}`} style={hue === undefined ? undefined : { '--creature-color': `hsl(${hue} 65% 70%)` } as CSSProperties}><i className="creature-leaf" /><i className="creature-eyes" /><i className="creature-cheeks" /><i className="creature-smile" /></span>
}

export function GardenWelcome({ play, meet, ready }: { play: () => void; meet: () => void; ready: boolean }) {
  return <section className="garden-intro" aria-label="Yaşam bahçene hoş geldin">
    <div className="intro-mascot"><GardenCreature small /><span aria-hidden="true">✦</span></div>
    <div className="intro-copy"><span><Sun size={13} /> KÜÇÜK DOKUNUŞLAR, YENİ HAYATLAR</span><h2>Bugün bahçende <em>neler olacak?</em></h2><p>Bir dostla tanış, yemek bırak. Büyüyen dünyanı keşfet.</p></div>
    <div className="intro-actions"><button disabled={!ready} onClick={meet}><Focus size={18} />Bir dosta yaklaş<ArrowRight size={16} /></button><button onClick={play}><Leaf size={17} />Hadi besleyelim</button></div>
  </section>
}

export interface GardenDiscovery { epoch?: number; met: boolean; food: number; added: number }
export function GardenSteps({ choose, meet, discovery, ready, challenge }: { choose: (tool: Tool) => void; meet: () => void; discovery: GardenDiscovery; ready: boolean; challenge?: ChallengeView | null }) {
  const unavailable = (tool: 'food' | 'organism') => !!challenge && (!challenge.remaining[tool] || challenge.status !== 'active')
  const steps = [
    { id: 'meet', title: 'Bir dostla tanış', detail: discovery.met ? 'Bir dostunu yakından tanıdın.' : 'Seni gerçek bir dosta götürelim.', done: discovery.met, icon: Focus, disabled: !ready, action: meet },
    { id: 'feed', title: 'Bahçene yemek bırak', detail: discovery.food ? `${discovery.food} besin bıraktın. Afiyet olsun!` : 'Besle’yi seç, bahçeye dokun.', done: discovery.food > 0, icon: Leaf, disabled: unavailable('food'), action: () => choose('food') },
    { id: 'add', title: 'Ailene bir dost kat', detail: discovery.added ? `${discovery.added} yeni dost ekledin.` : 'Dost ekle’yi seç, bir yer göster.', done: discovery.added > 0, icon: Sprout, disabled: unavailable('organism'), action: () => choose('organism') },
  ]
  return <section className="garden-discovery" aria-label="Üç adımda keşfet">
    <div className="discovery-heading"><Sparkles size={15} /><span>Küçük keşiflerin</span><strong data-testid="discovery-progress">{steps.filter(step => step.done).length}/3</strong></div>
    <div className="discovery-steps">{steps.map(({ id, title, detail, done, icon: Icon, disabled, action }, index) => <button key={id} className={done ? 'discovered' : ''} data-testid={`discovery-${id}`} data-complete={done} disabled={disabled} onClick={action}>
      <span className="discovery-symbol">{done ? <Check size={18} /> : <Icon size={19} />}</span><span><small>{done ? 'KEŞFEDİLDİ' : `0${index + 1} · SIRA SENDE`}</small><strong>{title}</strong><span>{detail}</span></span><ArrowRight size={16} />
    </button>)}</div>
  </section>
}

export function GardenPeek({ frame, inspect, clear }: { frame: Frame; inspect: (id: number) => void; clear: () => void }) {
  const selected = frame.selected
  if (!selected) return null
  return <div className="garden-peek"><GardenCreature small hue={selected.dna.hue} /><span><strong>Minik #{selected.id}</strong><small>{selected.generation}. nesil · {Math.round(selected.energy / energyCapacity(selected.dna) * 100)}% enerji</small></span><button aria-label="Seçili dostu yakından izle" onClick={() => inspect(selected.id)}><MousePointer2 size={18} /></button><button aria-label="Seçili dost kartını kapat" onClick={clear}><X size={18} /></button></div>
}

function highestGeneration(frame: Frame | null) {
  let max = 0
  if (frame) for (let i = 7; i < frame.agents.length; i += STRIDE) max = Math.max(max, frame.agents[i])
  return max
}
const STAGES = [
  { title: 'Merhaba dünya', description: 'İlk dostlarımız bahçede.', icon: Sprout },
  { title: 'İlk yavrular', description: 'İlk yeni nesil aramıza katıldı!', icon: Heart },
  { title: 'Yeni nesiller', description: 'Yavruların da yavruları oldu.', icon: Leaf },
  { title: 'Büyüyen aile', description: 'Üçüncü nesil ve sonrası burada.', icon: Dna },
]
export function GardenCompanion({ frame, inspect, clear, lab }: { frame: Frame | null; inspect: (id: number) => void; clear: () => void; lab: () => void }) {
  const generation = useMemo(() => highestGeneration(frame), [frame]), stage = Math.min(3, generation), selected = frame?.selected, empty = frame?.stats.population === 0
  return <aside className="garden-companion" aria-label="Bahçenin gelişimi"><div className="companion-heading"><span><Sparkles size={17} />Yaşam yolculuğu</span><span>CANLI</span></div><div className="growth-mascot" key={`${frame?.worldEpoch}-${stage}`}><div className="growth-halo" /><GardenCreature color={stage >= 2 ? 'purple' : stage === 1 ? 'peach' : 'green'} /><span className="growth-badge"><Sprout size={13} /><b data-testid="garden-generation">{generation}.</b> nesil</span></div><h3>{empty ? 'Yeni dostlar bekleniyor' : STAGES[stage].title}</h3><p className="growth-description">{empty ? 'Dost ekle ile bahçeye yeniden yaşam kat.' : STAGES[stage].description}</p><ol className="growth-path" aria-label="Yaşayan nesiller">{STAGES.map(({ title, icon: Icon }, i) => <li key={title} className={i < stage ? 'passed' : i === stage ? 'current' : ''} aria-current={i === stage ? 'step' : undefined}><span>{i < stage ? <Check size={15} /> : <Icon size={15} />}</span><div><strong>{title}</strong><small>{i === 0 ? 'Başlangıç' : `${i}. nesil${i === 3 ? ' ve sonrası' : ''}`}</small></div>{i === stage && <i className="path-dot" />}</li>)}</ol><div className="growth-numbers"><span><Heart size={15} /><strong data-testid="garden-births">{frame?.stats.births ?? 0}</strong><small>doğan yavru</small></span><span><Leaf size={15} /><strong>{frame?.stats.eaten ?? 0}</strong><small>yenen besin</small></span></div>{selected ? <section className="little-friend"><div className="little-friend-title"><span>YENİ DOSTUN</span><button aria-label="Bahçede canlı seçimini kaldır" onClick={clear}><X size={16} /></button></div><div><GardenCreature small hue={selected.dna.hue} /><span><strong>Minik #{selected.id}</strong><small>{selected.generation}. nesil · {selected.children} yavru</small></span></div><label>Enerjisi <strong>{Math.round(selected.energy / energyCapacity(selected.dna) * 100)}%</strong></label><progress max={energyCapacity(selected.dna)} value={selected.energy} aria-label="Seçili dostun enerjisi" /><button onClick={() => inspect(selected.id)}><MousePointer2 size={15} />Yakından izle<ArrowRight size={14} /></button><button className="friend-details" onClick={lab}>DNA ve beynini incele<ArrowRight size={14} /></button></section> : <div className="companion-tip"><Sun size={20} /><p>Bir dosta dokun.<br /><strong>Onun küçük dünyasını tanı!</strong></p></div>}<small className="growth-note">Yolculuk, yaşayan canlıların nesillerini gösterir. Her nesil farklıdır.</small></aside>
}

type Celebration = { serial: number; title: string; detail: string; kind: 'birth' | 'generation' }
export function LifeCelebration({ frame, motion }: { frame: Frame | null; motion: boolean }) {
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const previous = useRef<{ epoch?: number; births: number; generation: number } | null>(null), last = useRef(0)
  useEffect(() => {
    if (!frame) return
    const generation = highestGeneration(frame), old = previous.current
    previous.current = { epoch: frame.worldEpoch, births: frame.stats.births, generation: old && old.epoch === frame.worldEpoch ? Math.max(old.generation, generation) : generation }
    if (!old || old.epoch !== frame.worldEpoch) { setCelebration(null); last.current = 0; return }
    const now = performance.now(), nextGeneration = generation > old.generation
    if (nextGeneration || frame.stats.births > old.births && now - last.current > 4500) {
      last.current = now
      setCelebration({ serial: now, kind: nextGeneration ? 'generation' : 'birth', title: nextGeneration ? `${generation}. nesil merhaba!` : 'Yeni bir yavru doğdu!', detail: nextGeneration ? 'Yaşam yolculuğunda yeni bir adım.' : 'Minik ailemizden yeni bir merhaba.' })
    }
  }, [frame])
  useEffect(() => { if (!celebration) return; const timer = setTimeout(() => setCelebration(null), 3200); return () => clearTimeout(timer) }, [celebration])
  if (!celebration) return null
  return <div key={celebration.serial} className={`life-celebration celebration-${celebration.kind}`} role="status" aria-live="polite" data-testid="life-celebration"><span className="celebration-icon"><Heart size={23} fill="currentColor" /></span><span><strong>{celebration.title}</strong><small>{celebration.detail}</small></span>{motion && <div className="celebration-confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i, '--x': `${(i * 41 % 100) - 50}px`, '--turn': `${i * 47}deg` } as CSSProperties} />)}</div>}</div>
}

export function GardenRunLabel({ running }: { running: boolean }) { return <>{running ? <Pause size={18} /> : <Play size={18} />}<span>{running ? 'Mola ver' : 'Devam et'}</span></> }
