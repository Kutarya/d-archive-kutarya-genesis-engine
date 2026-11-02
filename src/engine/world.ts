import { copyDNA, createDNA, forward, mutateDNA, traitKeys, TRAITS, validateDNA } from './genetics.ts'
import { Random } from './random.ts'
import { SpatialIndex } from './spatial.ts'
import { clamp, DEFAULT_CONFIG, energyCapacity, HIDDEN, INPUTS, MAX_HISTORY, OUTPUTS, STRIDE } from './types.ts'
import type { DNA, Food, Frame, Hazard, Organism, Statistics, Totals, WorldConfig, WorldEvent, WorldState } from './types.ts'
import { finite, validateConfig, validateState } from './validation.ts'

export function energyCost(o: Organism, temperature: number): number {
  const d = o.dna, stress = Math.abs(temperature - 22) / 18
  const basal = (0.25 + d.size ** 2 * 0.026 + d.maxSpeed ** 2 * 0.000065 + d.senseRadius ** 2 * 0.000006 + d.longevity * 0.001) / d.efficiency
  return basal * (1 + stress ** 2 * 0.45) + d.movementCost * o.speed ** 2 * 0.006
}
export class World {
  config: WorldConfig
  rng: Random
  tick = 0
  organisms: Organism[] = []
  food: Food[] = []
  hazards: Hazard[] = []
  founders: DNA[] = []
  history: Statistics[] = []
  totals: Totals = { births: 0, deaths: 0, eaten: 0, starvation: 0, ageing: 0, hazard: 0 }
  nextId = 1
  nextFoodId = 1
  foodAccumulator = 0
  nextSampleTick: number
  private foodIndex: SpatialIndex<Food>
  private agentIndex: SpatialIndex<{ x: number; y: number }>
  private positions: { x: number; y: number }[] = []
  private consumed = new Set<number>()
  private eligibleFood = (f: Food) => !this.consumed.has(f.id)
  private events: WorldEvent[] = []
  private eventId = 0
  constructor(input: WorldConfig = DEFAULT_CONFIG, genomes?: readonly DNA[]) {
    this.config = validateConfig(input)
    if (genomes && genomes.length !== this.config.initialPopulation) throw new Error('Genom ve başlangıç nüfusu uyuşmuyor.')
    if (genomes) for (const dna of genomes) validateDNA(dna)
    this.rng = new Random(this.config.seed)
    this.foodIndex = new SpatialIndex(this.config.width)
    this.agentIndex = new SpatialIndex(this.config.width)
    this.nextSampleTick = Math.round(1 / this.config.stepSeconds)
    for (let i = 0; i < Math.floor(this.config.foodCapacity * 0.65); i++) this.addFood()
    for (let i = 0; i < 2; i++) this.addHazard(this.rng.range(this.config.width * 0.2, this.config.width * 0.8), this.rng.range(this.config.height * 0.2, this.config.height * 0.8), 75, 0.6)
    for (let i = 0; i < this.config.initialPopulation; i++) {
      const dna = genomes ? copyDNA(genomes[i]) : createDNA(this.rng)
      this.organisms.push(this.makeOrganism(dna))
      this.founders.push(copyDNA(dna))
    }
    this.history.push(this.statistics())
  }
  get time() { return this.tick * this.config.stepSeconds }
  private makeOrganism(dna: DNA, x?: number, y?: number): Organism {
    const id = this.nextId++
    return { id, x: x ?? this.rng.range(15, this.config.width - 15), y: y ?? this.rng.range(15, this.config.height - 15), heading: this.rng.range(-Math.PI, Math.PI), speed: 0, energy: energyCapacity(dna) * 0.74, age: 0, generation: 0, parents: [], lineage: id, dna, eaten: 0, children: 0, cooldown: 0, distance: 0, inputs: new Array<number>(INPUTS).fill(0), hidden: new Array<number>(HIDDEN).fill(0), outputs: new Array<number>(OUTPUTS).fill(0) }
  }
  addOrganism(x?: number, y?: number): number {
    if (this.organisms.length >= this.config.capacity) throw new Error('Canlı kapasitesine ulaşıldı.')
    if (x !== undefined) finite(x, 0, this.config.width, 'Konum X')
    if (y !== undefined) finite(y, 0, this.config.height, 'Konum Y')
    const o = this.makeOrganism(createDNA(this.rng), x, y)
    this.organisms.push(o)
    this.emit('birth', o.x, o.y)
    return o.id
  }
  addFood(x?: number, y?: number): void {
    if (this.food.length >= this.config.foodCapacity) return
    if (x !== undefined) finite(x, 0, this.config.width, 'Besin X')
    if (y !== undefined) finite(y, 0, this.config.height, 'Besin Y')
    this.food.push({ id: this.nextFoodId++, x: x ?? this.rng.range(8, this.config.width - 8), y: y ?? this.rng.range(8, this.config.height - 8), energy: this.rng.range(8, 18) })
  }
  addHazard(x: number, y: number, radius = 80, intensity = 0.7) {
    if (this.hazards.length >= 32) throw new Error('En fazla 32 tehlikeli bölge olabilir.')
    finite(x, 0, this.config.width, 'Tehlike X'); finite(y, 0, this.config.height, 'Tehlike Y')
    finite(radius, 10, 250, 'Tehlike yarıçapı'); finite(intensity, 0, 2, 'Tehlike şiddeti')
    this.hazards.push({ x, y, radius, intensity })
  }
  updateEnvironment(patch: Partial<Pick<WorldConfig, 'temperature' | 'mutationRate' | 'foodRate'>>) { this.config = validateConfig({ ...this.config, ...patch }) }
  private emit(kind: WorldEvent['kind'], x: number, y: number) {
    this.events.push({ id: ++this.eventId, kind, x, y })
    if (this.events.length > 80) this.events.shift()
  }
  private sense(o: Organism): number {
    const c = Math.cos(o.heading), s = Math.sin(o.heading), inputs = o.inputs, r = o.dna.senseRadius
    const target = this.foodIndex.nearest(o.x, o.y, r, this.eligibleFood)
    inputs[0] = inputs[1] = inputs[2] = 0
    if (target) {
      const dx = target.x - o.x, dy = target.y - o.y, distance = Math.hypot(dx, dy)
      const inv = distance > 0 ? 1 / distance : 0
      inputs[0] = (dx * c + dy * s) * inv; inputs[1] = (-dx * s + dy * c) * inv
      inputs[2] = 1 - distance / r
    }
    inputs[3] = clamp(o.energy / energyCapacity(o.dna), 0, 1)
    inputs[4] = o.speed / o.dna.maxSpeed
    inputs[5] = clamp((this.agentIndex.count(o.x, o.y, 65) - 1) / 16, 0, 1)
    let danger = 0, nearest: Hazard | null = null, nearDistance = Infinity
    for (const h of this.hazards) {
      const distance = Math.hypot(h.x - o.x, h.y - o.y)
      if (distance < nearDistance) { nearest = h; nearDistance = distance }
      if (distance < h.radius) danger += h.intensity * (1 - distance / h.radius)
    }
    inputs[6] = inputs[7] = 0
    if (nearest && nearDistance < r + nearest.radius) {
      const dx = nearest.x - o.x, dy = nearest.y - o.y, inv = nearDistance > 0 ? 1 / nearDistance : 0
      const proximity = 1 - clamp((nearDistance - nearest.radius) / r, 0, 1)
      inputs[6] = (dx * c + dy * s) * inv * proximity
      inputs[7] = (-dx * s + dy * c) * inv * proximity
    }
    inputs[8] = clamp(danger, 0, 1); inputs[9] = clamp(Math.abs(this.config.temperature - 22) / 25, 0, 1)
    const wallX = clamp((65 - o.x) / 65, 0, 1) - clamp((o.x - this.config.width + 65) / 65, 0, 1)
    const wallY = clamp((65 - o.y) / 65, 0, 1) - clamp((o.y - this.config.height + 65) / 65, 0, 1)
    inputs[10] = clamp(wallX * c + wallY * s, -1, 1); inputs[11] = clamp(-wallX * s + wallY * c, -1, 1)
    return danger
  }
  step(count = 1) {
    finite(count, 1, 100000, 'Adım sayısı', true)
    for (let k = 0; k < count; k++) this.stepOne()
  }
  private stepOne() {
    const dt = this.config.stepSeconds
    this.consumed.clear()
    this.foodIndex.rebuild(this.food)
    this.positions.length = this.organisms.length
    for (let i = 0; i < this.organisms.length; i++) {
      const o = this.organisms[i]
      if (!this.positions[i]) this.positions[i] = { x: o.x, y: o.y }
      else { this.positions[i].x = o.x; this.positions[i].y = o.y }
    }
    this.agentIndex.rebuild(this.positions)
    const survivors: Organism[] = [], children: Organism[] = []
    for (const o of this.organisms) {
      const danger = this.sense(o)
      forward(o.dna.weights, o.inputs, o.hidden, o.outputs)
      o.heading += o.outputs[1] * 2.6 * dt
      o.heading = ((o.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      const desiredSpeed = (o.outputs[0] + 1) * 0.5 * o.dna.maxSpeed
      o.speed += (desiredSpeed - o.speed) * (1 - Math.exp(-3 * dt))
      o.x += Math.cos(o.heading) * o.speed * dt; o.y += Math.sin(o.heading) * o.speed * dt
      if (o.x < o.dna.size || o.x > this.config.width - o.dna.size) { o.heading = Math.PI - o.heading; o.x = clamp(o.x, o.dna.size, this.config.width - o.dna.size) }
      if (o.y < o.dna.size || o.y > this.config.height - o.dna.size) { o.heading = -o.heading; o.y = clamp(o.y, o.dna.size, this.config.height - o.dna.size) }
      o.heading = ((o.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      o.distance += o.speed * dt
      o.age += dt; o.cooldown = Math.max(0, o.cooldown - dt)
      o.energy -= (energyCost(o, this.config.temperature) + danger * 12) * dt
      const eaten = this.foodIndex.nearest(o.x, o.y, o.dna.size + 3, this.eligibleFood)
      if (eaten && Number.isFinite(o.energy)) {
        this.consumed.add(eaten.id); o.energy = Math.min(energyCapacity(o.dna), o.energy + eaten.energy)
        o.eaten++; this.totals.eaten++; this.emit('eat', o.x, o.y)
      }
      if (!Number.isFinite(o.energy) || !Number.isFinite(o.x) || !Number.isFinite(o.y) || o.energy <= 0 || o.age >= o.dna.longevity) {
        this.totals.deaths++
        if (o.age >= o.dna.longevity) this.totals.ageing++
        else if (danger > 0) this.totals.hazard++
        else this.totals.starvation++
        if (Number.isFinite(o.x) && Number.isFinite(o.y)) this.emit('death', o.x, o.y)
        continue
      }
      if (this.config.reproductionEnabled && this.organisms.length + children.length < this.config.capacity && o.age >= 10 && o.cooldown === 0 && danger < 0.12 && o.inputs[9] < 0.85 && o.energy >= energyCapacity(o.dna) * o.dna.reproductionThreshold && o.outputs[2] > -0.2) {
        const dna = mutateDNA(o.dna, this.rng, this.config.mutationRate)
        const child = this.makeOrganism(dna, clamp(o.x + this.rng.range(-12, 12), dna.size, this.config.width - dna.size), clamp(o.y + this.rng.range(-12, 12), dna.size, this.config.height - dna.size))
        const transfer = Math.min(o.energy * 0.36, energyCapacity(dna) * 0.75)
        child.energy = transfer; child.generation = o.generation + 1; child.parents = [o.id]; child.lineage = o.lineage
        child.cooldown = 8
        o.energy -= transfer + 8 + o.dna.size * 0.6; o.cooldown = 8; o.children++
        children.push(child); this.totals.births++; this.emit('birth', child.x, child.y)
      }
      survivors.push(o)
    }
    this.organisms = survivors.concat(children)
    if (this.consumed.size) this.food = this.food.filter(f => !this.consumed.has(f.id))
    this.foodAccumulator += this.config.foodRate * dt
    while (this.foodAccumulator >= 1 && this.food.length < this.config.foodCapacity) { this.addFood(); this.foodAccumulator -= 1 }
    if (this.food.length >= this.config.foodCapacity) this.foodAccumulator = 0
    this.tick++
    if (this.tick >= this.nextSampleTick) {
      this.history.push(this.statistics())
      if (this.history.length > MAX_HISTORY) this.history.shift()
      this.nextSampleTick += Math.round(1 / dt)
    }
  }
  statistics(): Statistics {
    let energy = 0, generation = 0, speed = 0, sense = 0, size = 0
    const sums = new Array<number>(20).fill(0), squares = new Array<number>(20).fill(0), lineages = new Set<number>()
    for (const o of this.organisms) {
      energy += o.energy; generation += o.generation; speed += o.speed; sense += o.dna.senseRadius; size += o.dna.size; lineages.add(o.lineage)
      for (let i = 0; i < 20; i++) {
        const key = traitKeys[i], bounds = key ? TRAITS[key] : null
        const value = bounds && key ? (o.dna[key] - bounds.min) / (bounds.max - bounds.min) : (o.dna.weights[(i - 8) * 13] + 3) / 6
        sums[i] += value; squares[i] += value * value
      }
    }
    const n = this.organisms.length, divisor = Math.max(1, n)
    let diversity = 0
    for (let i = 0; i < sums.length; i++) diversity += Math.sqrt(Math.max(0, squares[i] / divisor - (sums[i] / divisor) ** 2)) * 2 / 20
    return { time: this.time, population: n, meanEnergy: energy / divisor, meanGeneration: generation / divisor, meanSpeed: speed / divisor, meanSense: sense / divisor, meanSize: size / divisor, diversity: clamp(diversity, 0, 1), births: this.totals.births, deaths: this.totals.deaths, food: this.food.length, lineages: lineages.size, eaten: this.totals.eaten }
  }
  frame(selectedId: number | null): Omit<Frame, 'running' | 'speed' | 'stepsPerSecond' | 'behindSeconds' | 'sentAt'> {
    const ids = new Uint32Array(this.organisms.length), agents = new Float32Array(this.organisms.length * STRIDE)
    for (let i = 0; i < this.organisms.length; i++) {
      const o = this.organisms[i], offset = i * STRIDE
      ids[i] = o.id
      agents.set([o.x, o.y, o.heading, o.dna.size, o.energy / energyCapacity(o.dna), o.dna.hue, o.speed, o.generation, o.dna.senseRadius, o.lineage], offset)
    }
    const food = new Float32Array(this.food.length * 2), hazards = new Float32Array(this.hazards.length * 4)
    for (let i = 0; i < this.food.length; i++) { food[i * 2] = this.food[i].x; food[i * 2 + 1] = this.food[i].y }
    for (let i = 0; i < this.hazards.length; i++) { const h = this.hazards[i]; hazards.set([h.x, h.y, h.radius, h.intensity], i * 4) }
    const selected = this.organisms.find(o => o.id === selectedId)
    const events = this.events; this.events = []
    return { ids, agents, food, hazards, width: this.config.width, height: this.config.height, seed: this.config.seed, capacity: this.config.capacity, temperature: this.config.temperature, foodRate: this.config.foodRate, tick: this.tick, stats: this.statistics(), selected: selected ? structuredClone(selected) : null, events }
  }
  exportState(): WorldState {
    return structuredClone({ schemaVersion: 1, config: this.config, rngState: this.rng.state, tick: this.tick, nextId: this.nextId, nextFoodId: this.nextFoodId, foodAccumulator: this.foodAccumulator, nextSampleTick: this.nextSampleTick, organisms: this.organisms, food: this.food, hazards: this.hazards, totals: this.totals, history: this.history, founders: this.founders })
  }
  static fromState(input: unknown): World {
    validateState(input)
    const state = structuredClone(input)
    const world = new World({ ...state.config, initialPopulation: 0, foodCapacity: 0 })
    world.config = state.config; world.rng = new Random(state.rngState); world.tick = state.tick
    world.nextId = state.nextId; world.nextFoodId = state.nextFoodId; world.foodAccumulator = state.foodAccumulator; world.nextSampleTick = state.nextSampleTick
    world.organisms = state.organisms; world.food = state.food; world.hazards = state.hazards; world.totals = state.totals
    world.history = state.history; world.founders = state.founders
    return world
  }
}
