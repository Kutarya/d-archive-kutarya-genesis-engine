import { Application, Container, Graphics, RendererType, Sprite, Texture } from 'pixi.js'
import { clamp, STRIDE } from '../engine/types.ts'
import type { Frame, WorldEvent } from '../engine/types.ts'
import type { Tool } from '../worker/protocol.ts'

export type Quality = 'high' | 'eco' | 'canvas'
export interface Viewport { x: number; y: number; width: number; height: number }
export interface HoverInfo { id: number; x: number; y: number; energy: number; generation: number }
interface Hooks { select: (id: number | null) => void; place: (tool: Exclude<Tool, 'select'>, x: number, y: number) => void; fps: (fps: number) => void; renderer: (name: string) => void; camera: (zoom: number) => void; unfollow: () => void; viewport?: (viewport: Viewport) => void; hover?: (hover: HoverInfo | null) => void }
interface Body { sprite: Sprite; fromX: number; fromY: number; targetX: number; targetY: number; size: number; heading: number; energy: number; appeared: number }
interface Pulse extends WorldEvent { started: number }
function color(hue: number): number {
  const h = ((hue % 360) + 360) % 360 / 60, x = 1 - Math.abs(h % 2 - 1)
  const values = h < 1 ? [1, x, 0] : h < 2 ? [x, 1, 0] : h < 3 ? [0, 1, x] : h < 4 ? [0, x, 1] : h < 5 ? [x, 0, 1] : [1, 0, x]
  const channel = (v: number) => Math.round((0.38 + v * 0.50) * 255)
  return (channel(values[0]) << 16) | (channel(values[1]) << 8) | channel(values[2])
}
export class WorldRenderer {
  private host: HTMLDivElement
  private hooks: Hooks
  private quality: Quality
  private app: Application | null = null
  private canvas: HTMLCanvasElement | null = null
  private context: CanvasRenderingContext2D | null = null
  private warning: HTMLDivElement | null = null
  private root = new Container()
  private background = new Graphics()
  private hazardLayer = new Graphics()
  private selection = new Graphics()
  private pulseLayer = new Graphics()
  private guideLayer = new Graphics()
  private foodLayer = new Container()
  private organismLayer = new Container()
  private bodies = new Map<number, Body>()
  private foods: Sprite[] = []
  private bodyTexture: Texture | null = null
  private pointTexture: Texture | null = null
  private frame: Frame | null = null
  private received = 0
  private interval = 50
  private pulses: Pulse[] = []
  private width = 1
  private height = 1
  private worldWidth = 0
  private worldHeight = 0
  private backgroundWidth = 0
  private backgroundHeight = 0
  private cx = 900
  private cy = 550
  private zoom = 0.5
  private selected: number | null = null
  private followed: number | null = null
  private tool: Tool = 'select'
  private showSense = true
  private destroyed = false
  private raf = 0
  private resizeObserver: ResizeObserver
  private pointers = new Map<number, { x: number; y: number; pan: boolean }>()
  private press = { x: 0, y: 0, moved: false }
  private cursor: { x: number; y: number } | null = null
  private brushRadius = 32
  private lastPaint = 0
  private paintedAt: { x: number; y: number } | null = null
  private hoverAt = 0
  private cameraAt = 0
  private publishedCamera: Viewport | null = null
  private trail: { x: number; y: number }[] = []
  private showTrail = true
  private animate = true
  private gardenView = true
  private frames = 0
  private fpsAt = performance.now()
  constructor(host: HTMLDivElement, quality: Quality, hooks: Hooks) {
    this.host = host; this.quality = quality; this.hooks = hooks
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(host)
    host.addEventListener('pointerdown', this.down)
    host.addEventListener('pointermove', this.move)
    host.addEventListener('pointerup', this.up)
    host.addEventListener('pointercancel', this.cancel)
    host.addEventListener('pointerleave', this.leave)
    host.addEventListener('contextmenu', this.contextMenu)
    host.addEventListener('wheel', this.wheel, { passive: false })
    this.resize()
    void this.initialize()
  }
  private texture(body: boolean): Texture {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')!
    if (body) {
      ctx.fillStyle = '#b1cb83'; ctx.beginPath(); ctx.ellipse(13, 19, 9, 4, .7, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#c6db9c'; ctx.beginPath(); ctx.ellipse(12, 31, 7, 3, -.5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#52653b16'; ctx.beginPath(); ctx.ellipse(33, 36, 23, 21, 0, 0, Math.PI * 2); ctx.fill()
    }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(32, 32, body ? 22 : 9, body ? 21 : 9, 0, 0, Math.PI * 2); ctx.fill()
    if (body) {
      ctx.strokeStyle = '#56663550'; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = '#ffffffaa'; ctx.beginPath(); ctx.ellipse(25, 20, 10, 5, -.45, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#344a35'; for (const y of [25, 39]) { ctx.beginPath(); ctx.ellipse(37, y, 2.8, 3.5, 0, 0, Math.PI * 2); ctx.fill() }
      ctx.fillStyle = '#ffffff'; for (const y of [24, 38]) { ctx.beginPath(); ctx.arc(37, y, 1, 0, Math.PI * 2); ctx.fill() }
      ctx.strokeStyle = '#4d5e3b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(44, 32, 2.2, -.9, .9); ctx.stroke()
      ctx.fillStyle = '#dd998a77'; for (const y of [21, 43]) { ctx.beginPath(); ctx.ellipse(42, y, 3.5, 2, .2, 0, Math.PI * 2); ctx.fill() }
    }
    return Texture.from(canvas)
  }
  private async initialize() {
    if (this.quality !== 'canvas') {
      try {
        const app = new Application()
        await app.init({ preference: 'webgl', backgroundColor: 0xf3f6e8, antialias: this.quality === 'high', resolution: this.quality === 'high' ? Math.min(devicePixelRatio, 2) : 1, autoDensity: true, autoStart: false, powerPreference: 'high-performance', width: this.host.clientWidth || 800, height: this.host.clientHeight || 600 })
        if (this.destroyed) { app.destroy(true, { children: true }); return }
        if (app.renderer.type !== RendererType.WEBGL) { app.destroy(true, { children: true }); this.useCanvas(); this.resize(); this.draw(); return }
        this.app = app; this.canvas = app.canvas; this.host.appendChild(app.canvas)
        this.bodyTexture = this.texture(true); this.pointTexture = this.texture(false)
        this.root.addChild(this.background, this.hazardLayer, this.foodLayer, this.guideLayer, this.organismLayer, this.pulseLayer, this.selection)
        app.stage.addChild(this.root)
        app.canvas.addEventListener('webglcontextlost', this.contextLost)
        this.hooks.renderer(this.quality === 'high' ? 'PixiJS · WebGL' : 'PixiJS · düşük güç')
      } catch {
        this.app?.destroy(true, { children: true }); this.app = null
        this.bodyTexture?.destroy(true); this.pointTexture?.destroy(true); this.bodyTexture = null; this.pointTexture = null
        this.useCanvas()
      }
    } else this.useCanvas()
    this.resize()
    if (this.frame) this.updateScene(this.frame)
    this.draw()
  }
  private contextLost = (event: Event) => {
    event.preventDefault()
    if (this.destroyed) return
    this.app?.destroy(true, { children: true }); this.app = null; this.root = new Container()
    this.bodies.clear(); this.foods = []
    this.useCanvas(); this.resize()
  }
  private useCanvas() {
    if (this.destroyed) return
    const canvas = document.createElement('canvas'); this.canvas = canvas; this.context = canvas.getContext('2d')
    if (!this.context) {
      this.warning = document.createElement('div'); this.warning.className = 'graphics-unavailable'
      this.warning.textContent = 'Grafik API’si açılamadı. Simülasyon ve kayıtlar korunuyor; başka bir tarayıcı deneyebilirsiniz.'
      this.host.appendChild(this.warning); this.hooks.renderer('Grafik API’si kullanılamıyor'); return
    }
    this.host.appendChild(canvas); this.hooks.renderer('Canvas 2D')
  }
  private resize() {
    this.width = Math.max(1, this.host.clientWidth); this.height = Math.max(1, this.host.clientHeight)
    if (this.app) this.app.renderer.resize(this.width, this.height)
    else if (this.canvas) { const ratio = Math.min(devicePixelRatio, 1.5); this.canvas.width = Math.round(this.width * ratio); this.canvas.height = Math.round(this.height * ratio); this.canvas.style.width = `${this.width}px`; this.canvas.style.height = `${this.height}px` }
  }
  accept(frame: Frame) {
    const freshWorld = !this.frame || frame.worldEpoch !== this.frame.worldEpoch || frame.tick < this.frame.tick || frame.seed !== this.frame.seed
    if (this.frame && (frame.worldEpoch !== this.frame.worldEpoch || frame.tick < this.frame.tick || frame.seed !== this.frame.seed)) {
      this.trail = []; this.pulses = []
      for (const body of this.bodies.values()) body.sprite.destroy()
      this.bodies.clear(); this.fit(); this.hooks.hover?.(null)
    }
    const now = performance.now(); this.interval = clamp(now - this.received, 20, 150); this.received = now; this.frame = frame
    if (frame.width !== this.worldWidth || frame.height !== this.worldHeight) { this.worldWidth = frame.width; this.worldHeight = frame.height; this.fit(); this.drawBackground() }
    if (freshWorld && this.gardenView) { this.cx = frame.width / 2; this.cy = frame.height / 2; this.zoom = 2; this.hooks.camera(this.zoom); this.publishCamera(true) }
    if (this.animate && frame.running) for (const event of frame.events) this.pulses.push({ ...event, started: now })
    if (this.pulses.length > 100) this.pulses = this.pulses.slice(-100)
    if (this.app) this.updateScene(frame)
    if (this.cursor && this.tool === 'select' && !this.pointers.size && now - this.hoverAt > 150) {
      this.hoverAt = now; const index = this.pick(this.worldPoint(this.cursor.x, this.cursor.y), 15), off = index * STRIDE
      this.hooks.hover?.(index < 0 ? null : { id: frame.ids[index], x: this.cursor.x, y: this.cursor.y, energy: frame.agents[off + 4], generation: frame.agents[off + 7] })
    }
    const index = this.selected === null ? -1 : frame.ids.indexOf(this.selected)
    if (index >= 0 && frame.running) { const off = index * STRIDE; this.trail.push({ x: frame.agents[off], y: frame.agents[off + 1] }); if (this.trail.length > 90) this.trail.shift() }
  }
  private drawBackground() {
    if (!this.app) return
    if (this.backgroundWidth === this.worldWidth && this.backgroundHeight === this.worldHeight) return
    this.backgroundWidth = this.worldWidth; this.backgroundHeight = this.worldHeight
    const g = this.background; g.clear().roundRect(0, 0, this.worldWidth, this.worldHeight, 38).fill(0xf7f9ed).stroke({ color: 0xc8d7b4, width: 2 })
    if (this.gardenView) {
      for (let x = 55; x < this.worldWidth - 20; x += 105) for (let y = 45; y < this.worldHeight - 20; y += 95) {
        const px = x + Math.sin(x + y) * 22, py = y + Math.cos(x - y) * 18
        g.ellipse(px, py, 2, 5).ellipse(px + 4, py + 1, 2, 3).fill({ color: 0x9eb783, alpha: .15 })
      }
    } else {
      for (let x = 80; x < this.worldWidth; x += 80) g.moveTo(x, 0).lineTo(x, this.worldHeight)
      for (let y = 80; y < this.worldHeight; y += 80) g.moveTo(0, y).lineTo(this.worldWidth, y)
      g.stroke({ color: 0xb6c49f, alpha: 0.18, width: 1 })
    }
  }
  private updateScene(frame: Frame) {
    if (!this.bodyTexture || !this.pointTexture) return
    this.drawBackground()
    const active = new Set<number>()
    for (let i = 0; i < frame.ids.length; i++) {
      const id = frame.ids[i], off = i * STRIDE, a = frame.agents; active.add(id)
      let body = this.bodies.get(id)
      if (!body) {
        const sprite = new Sprite(this.bodyTexture); sprite.anchor.set(.5); this.organismLayer.addChild(sprite)
        body = { sprite, fromX: a[off], fromY: a[off + 1], targetX: a[off], targetY: a[off + 1], size: a[off + 3], heading: a[off + 2], energy: a[off + 4], appeared: performance.now() }
        sprite.position.set(a[off], a[off + 1]); this.bodies.set(id, body)
      }
      body.fromX = body.sprite.x; body.fromY = body.sprite.y; body.targetX = a[off]; body.targetY = a[off + 1]; body.size = a[off + 3]; body.heading = a[off + 2]; body.energy = a[off + 4]
      body.sprite.tint = color(a[off + 5]); body.sprite.alpha = .65 + clamp(body.energy, 0, 1) * .35
      body.sprite.width = body.size * 4.8; body.sprite.height = body.size * 3.5
    }
    for (const [id, body] of this.bodies) if (!active.has(id)) { body.sprite.destroy(); this.bodies.delete(id) }
    for (let i = 0; i < frame.food.length / 2; i++) {
      if (!this.foods[i]) { const sprite = new Sprite(this.pointTexture); sprite.anchor.set(.5); sprite.tint = 0xd6a242; sprite.alpha = .85; sprite.width = sprite.height = 14; this.foodLayer.addChild(sprite); this.foods.push(sprite) }
      this.foods[i].position.set(frame.food[i * 2], frame.food[i * 2 + 1]); this.foods[i].visible = true
    }
    for (let i = frame.food.length / 2; i < this.foods.length; i++) this.foods[i].visible = false
    const h = this.hazardLayer; h.clear()
    for (let i = 0; i < frame.hazards.length; i += 4) h.circle(frame.hazards[i], frame.hazards[i + 1], frame.hazards[i + 2]).fill({ color: 0xd99173, alpha: .10 }).stroke({ color: 0xc58a74, width: 1.5, alpha: .5 })
  }
  setTool(tool: Tool) { this.tool = tool; this.paintedAt = null; this.host.style.cursor = tool === 'select' ? 'grab' : 'crosshair'; this.hooks.hover?.(null) }
  brush(radius: number) { this.brushRadius = clamp(radius, 12, 180) }
  select(id: number | null) { if (id !== this.selected) this.trail = []; this.selected = id }
  follow(id: number | null) { this.followed = id }
  sense(value: boolean) { this.showSense = value }
  traces(value: boolean) { this.showTrail = value }
  motion(value: boolean) { this.animate = value; if (!value) this.pulses = [] }
  garden(value: boolean) { if (this.gardenView !== value) { this.gardenView = value; this.backgroundWidth = 0; this.drawBackground() } }
  nearbyFriend(): number | undefined {
    if (!this.frame?.ids.length) return undefined
    let found = this.frame.ids[0], distance = Infinity
    for (let i = 0; i < this.frame.ids.length; i++) {
      if (this.frame.ids.length > 1 && this.frame.ids[i] === this.selected) continue
      const off = i * STRIDE, d = Math.hypot(this.frame.agents[off] - this.cx, this.frame.agents[off + 1] - this.cy)
      if (d < distance) { distance = d; found = this.frame.ids[i] }
    }
    return found
  }
  centerOn(x: number, y: number) { this.cx = clamp(x, 0, this.worldWidth); this.cy = clamp(y, 0, this.worldHeight); this.followed = null; this.hooks.unfollow(); this.publishCamera(true) }
  inspect(id: number) { const i = this.frame?.ids.indexOf(id) ?? -1; if (i < 0 || !this.frame) return; this.cx = this.frame.agents[i * STRIDE]; this.cy = this.frame.agents[i * STRIDE + 1]; this.zoom = Math.max(this.zoom, this.gardenView ? 2.6 : 1.6); this.followed = id; this.hooks.camera(this.zoom); this.publishCamera(true) }
  private publishCamera(force = false) {
    const now = performance.now()
    if (!force && now - this.cameraAt < 120) return
    this.cameraAt = now
    const rect = { x: this.cx - this.width / this.zoom / 2, y: this.cy - this.height / this.zoom / 2, width: this.width / this.zoom, height: this.height / this.zoom }
    const previous = this.publishedCamera
    if (!previous || Object.keys(rect).some(key => Math.abs(rect[key as keyof Viewport] - previous[key as keyof Viewport]) > .01)) { this.publishedCamera = rect; this.hooks.viewport?.(rect) }
  }
  fit() { this.followed = null; this.hooks.unfollow(); this.cx = this.worldWidth / 2 || 900; this.cy = this.worldHeight / 2 || 550; this.zoom = clamp(Math.min((this.width - 44) / (this.worldWidth || 1800), (this.height - 44) / (this.worldHeight || 1100)), .08, 3); this.hooks.camera(this.zoom); this.publishCamera(true) }
  zoomBy(factor: number, screenX = this.width / 2, screenY = this.height / 2) {
    const before = this.worldPoint(screenX, screenY), next = clamp(this.zoom * factor, .08, 4)
    this.zoom = next; this.cx = clamp(before.x - (screenX - this.width / 2) / next, 0, this.worldWidth); this.cy = clamp(before.y - (screenY - this.height / 2) / next, 0, this.worldHeight); this.hooks.camera(next); this.publishCamera(true)
  }
  private worldPoint(x: number, y: number) { return { x: this.cx + (x - this.width / 2) / this.zoom, y: this.cy + (y - this.height / 2) / this.zoom } }
  private location(event: PointerEvent) { const rect = this.host.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top } }
  private down = (event: PointerEvent) => {
    const p = this.location(event); this.pointers.set(event.pointerId, { ...p, pan: event.button !== 0 }); this.host.setPointerCapture(event.pointerId)
    this.press = { ...p, moved: this.pointers.size > 1 }; this.paintedAt = null
  }
  private pick(point: { x: number; y: number }, pixels = 20): number {
    if (!this.frame) return -1
    let nearest = -1, distance = Infinity
    for (let i = 0; i < this.frame.ids.length; i++) { const off = i * STRIDE; const body = this.bodies.get(this.frame.ids[i]); const d = Math.hypot((body?.sprite.x ?? this.frame.agents[off]) - point.x, (body?.sprite.y ?? this.frame.agents[off + 1]) - point.y); if (d < distance && d <= Math.max(pixels / this.zoom, this.frame.agents[off + 3] * (this.gardenView ? 2.1 : 1.5))) { distance = d; nearest = i } }
    return nearest
  }
  private move = (event: PointerEvent) => {
    const point = this.location(event)
    this.cursor = point
    if (event.pointerType !== 'touch' && this.tool === 'select' && performance.now() - this.hoverAt > 100) {
      this.hoverAt = performance.now(); const index = this.pick(this.worldPoint(point.x, point.y), 15), off = index * STRIDE
      this.hooks.hover?.(index < 0 || !this.frame ? null : { id: this.frame.ids[index], x: point.x, y: point.y, energy: this.frame.agents[off + 4], generation: this.frame.agents[off + 7] })
    }
    const previous = this.pointers.get(event.pointerId)
    if (!previous) return
    if (Math.hypot(point.x - this.press.x, point.y - this.press.y) > 5) this.press.moved = true
    if (this.pointers.size === 2) {
      const other = [...this.pointers.entries()].find(([id]) => id !== event.pointerId)![1]
      const before = Math.hypot(previous.x - other.x, previous.y - other.y), after = Math.hypot(point.x - other.x, point.y - other.y)
      if (before > 5) this.zoomBy(after / before, (point.x + other.x) / 2, (point.y + other.y) / 2)
      this.press.moved = true
    } else if (this.tool === 'food' && !previous.pan) {
      const p = this.worldPoint(point.x, point.y), now = performance.now()
      if (this.press.moved && (!this.paintedAt || Math.hypot(p.x - this.paintedAt.x, p.y - this.paintedAt.y) >= this.brushRadius * .65) && now - this.lastPaint >= 90 && p.x >= 0 && p.y >= 0 && p.x <= this.worldWidth && p.y <= this.worldHeight) { this.hooks.place('food', p.x, p.y); this.paintedAt = p; this.lastPaint = now }
    } else { this.cx = clamp(this.cx - (point.x - previous.x) / this.zoom, 0, this.worldWidth); this.cy = clamp(this.cy - (point.y - previous.y) / this.zoom, 0, this.worldHeight) }
    if (this.followed !== null) { this.followed = null; this.hooks.unfollow() }
    this.pointers.set(event.pointerId, { ...point, pan: previous.pan })
  }
  private cancel = (event: PointerEvent) => { this.pointers.delete(event.pointerId); this.press.moved = true }
  private up = (event: PointerEvent) => {
    const pointer = this.pointers.get(event.pointerId); this.pointers.delete(event.pointerId)
    if (this.press.moved || pointer?.pan || !this.frame) return
    const screen = this.location(event), point = this.worldPoint(screen.x, screen.y)
    if (this.tool !== 'select') {
      if (point.x >= 0 && point.y >= 0 && point.x <= this.worldWidth && point.y <= this.worldHeight) this.hooks.place(this.tool, point.x, point.y)
      return
    }
    const index = this.pick(point)
    this.hooks.select(index < 0 ? null : this.frame.ids[index])
  }
  private leave = () => { if (!this.pointers.size) this.cursor = null; this.hooks.hover?.(null) }
  private contextMenu = (event: Event) => event.preventDefault()
  private wheel = (event: WheelEvent) => { event.preventDefault(); const rect = this.host.getBoundingClientRect(); this.zoomBy(Math.exp(-event.deltaY * .001), event.clientX - rect.left, event.clientY - rect.top) }
  private draw = () => {
    if (this.destroyed) return
    const now = performance.now(), frame = this.frame
    if (frame && !document.hidden) {
      const alpha = clamp((now - this.received) / this.interval, 0, 1)
      for (const [id, body] of this.bodies) {
        body.sprite.position.set(body.fromX + (body.targetX - body.fromX) * alpha, body.fromY + (body.targetY - body.fromY) * alpha); body.sprite.rotation = body.heading
        const grow = this.animate && frame.running ? Math.min(1, (now - body.appeared) / 550) : 1
        const breathe = this.animate && frame.running && this.quality === 'high' ? 1 + Math.sin(now / 380 + id) * .035 : 1
        body.sprite.width = body.size * (this.gardenView ? 6 : 4.8) * (1 - (1 - grow) ** 3) * breathe; body.sprite.height = body.size * (this.gardenView ? 6 : 3.5) * (1 - (1 - grow) ** 3) / breathe
      }
      if (this.followed !== null) {
        const index = frame.ids.indexOf(this.followed)
        if (index >= 0) { this.cx += (frame.agents[index * STRIDE] - this.cx) * .12; this.cy += (frame.agents[index * STRIDE + 1] - this.cy) * .12 }
      }
      this.pulses = frame.running && this.animate ? this.pulses.filter(pulse => now - pulse.started < 1200) : []
      this.publishCamera()
      if (this.app) {
        this.root.scale.set(this.zoom); this.root.position.set(this.width / 2 - this.cx * this.zoom, this.height / 2 - this.cy * this.zoom)
        this.guideLayer.clear()
        if (this.showTrail && this.trail.length > 1) { this.guideLayer.moveTo(this.trail[0].x, this.trail[0].y); for (const point of this.trail.slice(1)) this.guideLayer.lineTo(point.x, point.y); this.guideLayer.stroke({ color: 0x709c5c, alpha: .25, width: 1.2 / this.zoom }) }
        if (this.cursor && this.tool !== 'select') { const p = this.worldPoint(this.cursor.x, this.cursor.y), r = this.tool === 'organism' ? 14 : this.brushRadius; const tint = this.tool === 'food' ? 0xc39843 : this.tool === 'organism' ? 0x83ad69 : 0xc38a79; this.guideLayer.circle(p.x, p.y, r).fill({ color: tint, alpha: .045 }).stroke({ color: tint, alpha: .75, width: 1 / this.zoom }); this.guideLayer.moveTo(p.x - 4 / this.zoom, p.y).lineTo(p.x + 4 / this.zoom, p.y).moveTo(p.x, p.y - 4 / this.zoom).lineTo(p.x, p.y + 4 / this.zoom).stroke({ color: tint, alpha: .8, width: 1 / this.zoom }) }
        const g = this.selection; g.clear(); const index = this.selected === null ? -1 : frame.ids.indexOf(this.selected)
        if (index >= 0) {
          const off = index * STRIDE, body = this.bodies.get(frame.ids[index]), x = body?.sprite.x ?? frame.agents[off], y = body?.sprite.y ?? frame.agents[off + 1], r = frame.agents[off + 3] * (this.gardenView ? 2.1 : 1) + 7
          if (this.showSense) g.circle(x, y, frame.agents[off + 8]).fill({ color: 0x87b56d, alpha: .04 }).stroke({ color: 0x70974f, alpha: .3, width: 1 / this.zoom })
          g.circle(x, y, r).stroke({ color: 0x5c8a48, width: 1.5 / this.zoom, alpha: .8 })
          g.moveTo(x, y - r - 5).arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frame.agents[off + 4]).stroke({ color: 0xd4a055, width: 2 / this.zoom })
        }
        this.pulseLayer.clear()
        if (this.animate) for (const p of this.pulses.slice(this.quality === 'high' ? -70 : -20)) {
          const t = (now - p.started) / 1200, tint = p.kind === 'birth' ? 0x85ad64 : p.kind === 'death' ? 0xc6a1b4 : 0xe2ac52
          this.pulseLayer.circle(p.x, p.y, 5 + t * (p.kind === 'birth' ? 42 : 22)).stroke({ color: tint, width: (p.kind === 'birth' ? 2 : 1) / this.zoom, alpha: (1 - t) * .65 })
          if (p.kind === 'birth') for (let i = 0; i < 6; i++) { const angle = i * Math.PI / 3 + t, r = 10 + t * 36; this.pulseLayer.circle(p.x + Math.cos(angle) * r, p.y + Math.sin(angle) * r, (1 - t) * 3 / this.zoom).fill({ color: tint, alpha: (1 - t) * .7 }) }
        }
        this.app.render()
      } else this.drawCanvas(frame)
    }
    if (!document.hidden && frame && (this.app || this.context)) this.frames++
    if (now - this.fpsAt >= 1000) { this.hooks.fps(this.frames * 1000 / (now - this.fpsAt)); this.frames = 0; this.fpsAt = now }
    this.raf = requestAnimationFrame(this.draw)
  }
  private drawCanvas(frame: Frame) {
    const c = this.context, canvas = this.canvas
    if (!c || !canvas) return
    const ratio = canvas.width / this.width
    c.setTransform(ratio, 0, 0, ratio, 0, 0); c.fillStyle = '#f3f6e8'; c.fillRect(0, 0, this.width, this.height)
    c.translate(this.width / 2 - this.cx * this.zoom, this.height / 2 - this.cy * this.zoom); c.scale(this.zoom, this.zoom)
    c.fillStyle = '#f7f9ed'; c.fillRect(0, 0, frame.width, frame.height); c.strokeStyle = '#c8d7b4'; c.lineWidth = 1 / this.zoom; c.strokeRect(0, 0, frame.width, frame.height)
    if (this.gardenView) {
      c.fillStyle = '#9eb78326'
      for (let x = 55; x < frame.width - 20; x += 105) for (let y = 45; y < frame.height - 20; y += 95) {
        const px = x + Math.sin(x + y) * 22, py = y + Math.cos(x - y) * 18
        c.beginPath(); c.ellipse(px, py, 2, 5, 0, 0, Math.PI * 2); c.ellipse(px + 4, py + 1, 2, 3, 0, 0, Math.PI * 2); c.fill()
      }
    } else { c.beginPath(); for (let x = 80; x < frame.width; x += 80) { c.moveTo(x, 0); c.lineTo(x, frame.height) } for (let y = 80; y < frame.height; y += 80) { c.moveTo(0, y); c.lineTo(frame.width, y) } c.strokeStyle = '#b6c49f30'; c.stroke() }
    for (let i = 0; i < frame.hazards.length; i += 4) { c.beginPath(); c.arc(frame.hazards[i], frame.hazards[i + 1], frame.hazards[i + 2], 0, Math.PI * 2); c.fillStyle = '#cc667014'; c.fill(); c.strokeStyle = '#cc66704d'; c.stroke() }
    c.fillStyle = '#d6a242cc'; for (let i = 0; i < frame.food.length; i += 2) { c.beginPath(); c.arc(frame.food[i], frame.food[i + 1], 2.2, 0, Math.PI * 2); c.fill() }
    if (this.showTrail && this.trail.length > 1) { c.beginPath(); c.moveTo(this.trail[0].x, this.trail[0].y); for (const point of this.trail.slice(1)) c.lineTo(point.x, point.y); c.strokeStyle = '#709c5c88'; c.lineWidth = 1.2 / this.zoom; c.stroke() }
    if (this.cursor && this.tool !== 'select') { const p = this.worldPoint(this.cursor.x, this.cursor.y); c.beginPath(); c.arc(p.x, p.y, this.tool === 'organism' ? 14 : this.brushRadius, 0, Math.PI * 2); c.fillStyle = '#b9dcb40b'; c.fill(); c.strokeStyle = this.tool === 'food' ? '#c39843bb' : '#c38a79bb'; c.lineWidth = 1 / this.zoom; c.stroke() }
    for (let i = 0; i < frame.ids.length; i++) {
      const off = i * STRIDE, a = frame.agents, r = a[off + 3]
      c.save(); c.translate(a[off], a[off + 1]); c.rotate(a[off + 2])
      const breathe = this.animate && frame.running ? 1 + Math.sin(performance.now() / 380 + frame.ids[i]) * .035 : 1
      c.scale(breathe, 1 / breathe)
      if (this.gardenView) c.scale(1.4, 1.4)
      c.fillStyle = '#a1bc7b'; c.beginPath(); c.ellipse(-r * 1.15, -r * .85, r * .6, r * .22, .7, 0, Math.PI * 2); c.fill()
      c.fillStyle = `hsla(${a[off + 5]},58%,68%,${.65 + a[off + 4] * .35})`
      c.beginPath(); c.ellipse(0, 0, r * 1.45, r * 1.38, 0, 0, Math.PI * 2); c.fill()
      c.strokeStyle = '#536e3944'; c.lineWidth = .6; c.stroke()
      c.fillStyle = '#ffffff88'; c.beginPath(); c.ellipse(-r * .3, -r * .75, r * .6, r * .28, -.4, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#3f5938'; for (const side of [-1, 1]) { c.beginPath(); c.ellipse(r * .35, side * r * .47, r * .18, r * .22, 0, 0, Math.PI * 2); c.fill() }
      c.fillStyle = '#ffffff'; for (const side of [-1, 1]) { c.beginPath(); c.arc(r * .35, side * r * .47 - r * .08, r * .06, 0, Math.PI * 2); c.fill() }
      c.strokeStyle = '#4d5e3b'; c.lineWidth = r * .08; c.beginPath(); c.arc(r * .8, 0, r * .15, -.9, .9); c.stroke()
      c.restore()
      if (frame.ids[i] === this.selected) { c.strokeStyle = '#70974f'; c.lineWidth = 1.5 / this.zoom; c.beginPath(); c.arc(a[off], a[off + 1], r * (this.gardenView ? 2.1 : 1) + 8, 0, Math.PI * 2); c.stroke(); if (this.showSense) { c.strokeStyle = '#70974f30'; c.beginPath(); c.arc(a[off], a[off + 1], a[off + 8], 0, Math.PI * 2); c.stroke() } }
    }
    if (this.animate) for (const p of this.pulses.slice(-30)) {
      const t = (performance.now() - p.started) / 1200
      c.beginPath(); c.arc(p.x, p.y, 5 + t * (p.kind === 'birth' ? 42 : 22), 0, Math.PI * 2)
      c.strokeStyle = p.kind === 'birth' ? `rgba(113,156,79,${(1-t)*.65})` : p.kind === 'eat' ? `rgba(216,169,72,${(1-t)*.6})` : `rgba(190,152,172,${(1-t)*.5})`
      c.lineWidth = (p.kind === 'birth' ? 2 : 1) / this.zoom; c.stroke()
    }
  }
  dispose() {
    this.destroyed = true; cancelAnimationFrame(this.raf); this.resizeObserver.disconnect()
    this.host.removeEventListener('pointerdown', this.down); this.host.removeEventListener('pointermove', this.move); this.host.removeEventListener('pointerup', this.up); this.host.removeEventListener('pointercancel', this.cancel); this.host.removeEventListener('wheel', this.wheel)
    this.host.removeEventListener('pointerleave', this.leave); this.host.removeEventListener('contextmenu', this.contextMenu)
    this.canvas?.removeEventListener('webglcontextlost', this.contextLost)
    this.warning?.remove()
    this.app?.destroy(true, { children: true }); if (!this.app) this.canvas?.remove()
    this.bodyTexture?.destroy(true); this.pointTexture?.destroy(true)
  }
}
