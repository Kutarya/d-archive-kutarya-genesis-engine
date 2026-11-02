import type { Frame, WorldConfig, WorldState } from '../engine/types.ts'
import type { Intervention, InterventionReceipt } from '../engine/interventions.ts'
export type Tool = 'select' | Intervention['tool']
export type Command =
  | { kind: 'init'; config: WorldConfig }
  | { kind: 'run'; running: boolean }
  | { kind: 'step'; count: number }
  | { kind: 'speed'; value: number }
  | { kind: 'select'; id: number | null }
  | { kind: 'environment'; patch: Partial<Pick<WorldConfig, 'temperature' | 'foodRate' | 'mutationRate'>> }
  | ({ kind: 'place' } & Intervention)
  | { kind: 'challenge'; id: string }
  | { kind: 'free' }
  | { kind: 'observe'; id: number; brain: boolean }
  | { kind: 'visibility'; hidden: boolean }
  | { kind: 'export'; requestId: number }
  | { kind: 'load'; state: unknown; requestId: number }
export type Response =
  | { kind: 'intervention'; receipt: InterventionReceipt }
  | { kind: 'frame'; frame: Frame }
  | { kind: 'state'; state: WorldState; requestId: number }
  | { kind: 'loaded'; requestId: number; config: WorldConfig }
  | { kind: 'error'; message: string; requestId?: number }
