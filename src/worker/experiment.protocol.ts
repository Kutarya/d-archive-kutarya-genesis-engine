import type { ExperimentOptions, ExperimentProgress, ExperimentReport, SelectionResult } from '../engine/evaluation.ts'
export interface ExperimentStatus {
  seed: string; index: number; count: number; completedSteps: number; totalSteps: number
  progress: ExperimentProgress; completed: SelectionResult[]
}
export type ExperimentCommand = { kind: 'start'; options: ExperimentOptions } | { kind: 'cancel' }
export type ExperimentResponse =
  | { kind: 'progress'; status: ExperimentStatus }
  | { kind: 'complete'; report: ExperimentReport }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string }
