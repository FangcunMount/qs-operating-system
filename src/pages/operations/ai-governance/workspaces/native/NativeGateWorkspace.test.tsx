import { render, screen } from '@testing-library/react'
import type { NativeEvaluationState, NativeGatePreview } from '@/api/path/aiWorkflow'
import { NativeGateWorkspace } from './NativeGateWorkspace'

jest.mock('../../components/JsonEvidence', () => ({ JsonEvidence: () => null }))

const run = { run_id: 'run:1', version: 218, status: 'awaiting_review', creation: {} } as NativeEvaluationState
function show(metrics: NativeGatePreview['gate_result']['metrics']): void {
  const preview = {
    run_id: 'run:1', version: 218, release_fingerprint: 'fingerprint',
    gate_result: { schema_version: 'qs-ai-evaluation-gate-preview/v1', evaluated_at: '2026-09-14T00:00:00Z',
      gate_passes: { G1: true, G2: true, G3: true, G4: true, G5: false }, metrics,
      reasons: [{ gate: 'G5', code: 'human_review_incomplete', evidence_refs: [] }], semantic_adjudications: [] }
  } as NativeGatePreview
  render(<NativeGateWorkspace run={run} preview={preview} locked={false} load={jest.fn()} finalize={jest.fn()} />)
}

test('recovered candidates show completion gate and separate honest call observations', () => {
  show([
    { name: 'candidate_completion_rate', numerator: 35, denominator: 35, value: 1, threshold: 1 },
    { name: 'observed_semantic_execution_success_rate', numerator: 35, denominator: 36, value: 35 / 36, threshold: null },
    { name: 'observed_semantic_retry_count', numerator: 1, denominator: 1, value: 1, threshold: null }
  ])
  expect(screen.getByText('候选最终完成率')).toBeInTheDocument()
  expect(screen.getByText('35/35（100.00%）')).toBeInTheDocument()
  expect(screen.getByText('35/36（97.22%）')).toBeInTheDocument()
  expect(screen.getAllByText('观测指标')).toHaveLength(2)
  expect(screen.getByText('发布门槛：100%')).toBeInTheDocument()
  expect(screen.getByText('人工审核尚未完成，请先补齐候选审核。')).toBeInTheDocument()
  expect(screen.queryByText('确认最终审核通过')).not.toBeInTheDocument()
})

test('legacy gate previews keep their original display and meaning', () => {
  show([{ name: 'semantic_execution_success_rate', numerator: 35, denominator: 36, value: 35 / 36, threshold: 0.98 }])
  expect(screen.queryByText('候选最终完成率')).not.toBeInTheDocument()
  expect(screen.queryByText('观测指标')).not.toBeInTheDocument()
})
