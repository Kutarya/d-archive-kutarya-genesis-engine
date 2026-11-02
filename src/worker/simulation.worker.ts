/// <reference lib="webworker" />
import { World } from '../engine/world.ts'
import { analyzePopulation } from '../engine/analysis.ts'
import { finite } from '../engine/validation.ts'
import { intervene } from '../engine/interventions.ts'
import { ChallengeSession, CHALLENGES } from '../game/challenges.ts'
import type { Command, Response } from './protocol.ts'

const scope = self as unknown as DedicatedWorkerGlobalScope
let world: World | null = null, running = true, hidden = false, speed = 1, selected: number | null = null
let accumulator = 0, last = performance.now(), lastFrame = 0, lastHistory = 0, rateAt = last, steps = 0, stepsPerSecond = 0, behindSeconds = 0
let loopTimer: number | undefined
let challenge: ChallengeSession | null = null
let worldEpoch = 0
function finishChallenge() { if (!world || !challenge) return; challenge.update(world); if (!challenge.active) { running = false; accumulator = 0 } }
function send(message: Response, transfer: Transferable[] = []) { scope.postMessage(message, transfer) }
function snapshot(forceHistory = false, urgent = true) {
  if (!world) return
  const now = performance.now(), data = world.frame(selected)
  const frame = { ...data, running, speed, stepsPerSecond, behindSeconds, sentAt: now, urgent }
  frame.challenge = challenge?.view(world) ?? null
  frame.worldEpoch = worldEpoch
  if (forceHistory || now - lastHistory >= 1000) {
    frame.history = [...world.history]
    frame.analysis = analyzePopulation(world.organisms, world.founders, world.totals, world.config.temperature)
    lastHistory = now
  }
  send({ kind: 'frame', frame }, [frame.ids.buffer, frame.agents.buffer, frame.food.buffer, frame.hazards.buffer])
  lastFrame = now
}
scope.onmessage = (event: MessageEvent<Command>) => {
  const cmd = event.data
  try {
    switch (cmd.kind) {
      case 'init': world = new World(cmd.config); worldEpoch++; challenge = null; running = true; selected = null; accumulator = 0; behindSeconds = 0; last = performance.now(); snapshot(true); break
      case 'challenge': {
        const definition = CHALLENGES.find(c => c.id === cmd.id)
        if (!definition) throw new Error('Görev bulunamadı.')
        world = new World(definition.config); worldEpoch++; challenge = new ChallengeSession(definition, world); running = true; speed = 1; selected = null; accumulator = 0; behindSeconds = 0; last = performance.now(); snapshot(true); break
      }
      case 'free': challenge = null; running = true; accumulator = 0; last = performance.now(); snapshot(); break
      case 'run': if (cmd.running && challenge && !challenge.active) throw new Error('Görev sona erdi. Serbest keşfe geçin veya yeniden deneyin.'); running = cmd.running; accumulator = 0; last = performance.now(); snapshot(); break
      case 'step':
        if (running) throw new Error('Adımlamak için önce simülasyonu duraklatın.')
        if (challenge && !challenge.active) throw new Error('Görev sona erdi. Serbest keşfe geçin veya yeniden deneyin.')
        finite(cmd.count, 1, 120, 'Elle adım', true)
        if (world) for (let i = 0; i < cmd.count; i++) { world.step(); steps++; finishChallenge(); if (challenge && !challenge.active) break }
        accumulator = 0; last = performance.now(); snapshot(true); break
      case 'speed': finite(cmd.value, 0.25, 16, 'Simülasyon hızı'); speed = cmd.value; snapshot(); break
      case 'select': selected = cmd.id; if (world) challenge?.observe(world, cmd.id); finishChallenge(); snapshot(); break
      case 'observe': if (world) challenge?.observe(world, cmd.id, cmd.brain); finishChallenge(); snapshot(); break
      case 'visibility':
        hidden = cmd.hidden; last = performance.now(); accumulator = 0
        if (loopTimer !== undefined) clearTimeout(loopTimer)
        loopTimer = setTimeout(loop, hidden ? 500 : 0)
        break
      case 'environment': if (challenge) throw new Error('Görev koşulları sabittir. Ayarları değiştirmek için serbest keşfe geçin.'); world?.updateEnvironment(cmd.patch); snapshot(); break
      case 'place':
        if (!world) break
        { const receipt = intervene(world, challenge ? challenge.restrict(cmd) : cmd)
          challenge?.record(receipt); if (receipt.selectedId !== undefined) selected = receipt.selectedId
          send({ kind: 'intervention', receipt }); finishChallenge() }
        snapshot(true); break
      case 'export': if (world) send({ kind: 'state', state: world.exportState(), requestId: cmd.requestId }); else throw new Error('Dünya henüz hazır değil.'); break
      case 'load': {
        const loaded = World.fromState(cmd.state)
        world = loaded; worldEpoch++; challenge = null; running = false; selected = null; accumulator = 0; behindSeconds = 0; last = performance.now()
        send({ kind: 'loaded', requestId: cmd.requestId, config: loaded.config }); snapshot(true); break
      }
    }
  } catch (error) { send({ kind: 'error', message: error instanceof Error ? error.message : 'Simülasyon işlemi başarısız.', requestId: 'requestId' in cmd ? cmd.requestId : undefined }) }
}
function loop() {
  const now = performance.now(), delta = Math.min((now - last) / 1000, 0.25); last = now
  if (world && running && !hidden) {
    const requested = accumulator + delta * speed
    if (requested > 1) behindSeconds += requested - 1
    accumulator = Math.min(requested, 1)
    const deadline = performance.now() + 7
    let count = 0
    try {
      while (running && accumulator >= world.config.stepSeconds && count < 120 && performance.now() < deadline) {
        world.step(); accumulator -= world.config.stepSeconds; steps++; count++
        finishChallenge()
      }
    } catch (error) { running = false; send({ kind: 'error', message: error instanceof Error ? error.message : 'Motor durduruldu.' }) }
  }
  if (now - rateAt >= 1000) { stepsPerSecond = steps * 1000 / (now - rateAt); steps = 0; rateAt = now }
  if (world && now - lastFrame >= (hidden || !running ? 1000 : 50)) snapshot(false, false)
  loopTimer = setTimeout(loop, hidden ? 500 : 8)
}
loop()
