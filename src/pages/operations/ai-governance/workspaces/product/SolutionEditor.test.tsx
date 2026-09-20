import { act, fireEvent, render, screen } from '@testing-library/react'
import type { Solution, SolutionModels } from '@/api/path/aiWorkflow/solutions'
import { SolutionEditor } from './SolutionEditor'

const content = { system_message: '系统', task_template: '模板', data_preamble: '事实', allowed_placeholders: [] }
const model = { model: 'deepseek-v4-pro', max_output_tokens: 8000, timeout_milliseconds: 60000, reasoning_effort: 'low' }
const ref = { id: 'p', version: 'v1', fingerprint: 'sha256:' + 'a'.repeat(64) }
const release = { suite: ref, prompt: ref, profile: ref, input_schema: ref, output_schema: ref,
  generation_route: ref, semantic_route: ref, semantic_prompt: ref, semantic_output_schema: ref,
  execution_policy: ref, gate_policy: ref }
const solution: Solution = {
  schema_version: 'qs-ai-solution/v1', source_release: release, draft_id: '11111111-1111-4111-8111-111111111111',
  draft_revision: 1, created_by: '10001', target_version: 'v2', source: { publication_id: null, run_id: null },
  solution_id: '11111111-1111-4111-8111-111111111111', title: '改进方案', reason: '提高准确度',
  revision: 1, content, original_content: content, generation: model, semantic: model,
  original_models: { generation: model, semantic: model }, prepared: null,
  updated_at: '2026-09-20T00:00:00Z', policy: {}, semantic_prompt: '质量规则'
}
const capabilities: SolutionModels = {
  models: ['deepseek-v4-pro'], provider: 'deepseek', credential_configured: true, endpoint_configured: true,
  max_output_tokens: { min: 1, max: 12000 }, timeout_milliseconds: { min: 1000, max: 180000 },
  reasoning_efforts: ['low', 'high'], unsupported_fields: ['temperature', 'top_p']
}
beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())
it('autosaves supported parameters and keeps prepare disabled until the server acknowledges them', async () => {
  const save = jest.fn().mockResolvedValue(null), prepare = jest.fn()
  render(<SolutionEditor solution={solution} capabilities={capabilities} busy={false} locked={false} error=""
    save={save} prepare={prepare} onDirty={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('生成解读输出上限'), { target: { value: '4000' } })
  expect(screen.getByText('尚未保存')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '准备完整测试' })).toBeDisabled()
  await act(async () => { jest.advanceTimersByTime(1600) })
  expect(save).toHaveBeenCalledTimes(1)
  expect(save.mock.calls[0][0].generation.max_output_tokens).toBe(4000)
  expect(save.mock.calls[0][0].semantic.max_output_tokens).toBe(8000)
  expect(prepare).not.toHaveBeenCalled()
  expect(screen.getByText('尚未保存')).toBeInTheDocument()
})
it('does not autosave invalid reasons or hide local text after a failed save', async () => {
  const save = jest.fn()
  const view = render(<SolutionEditor solution={solution} capabilities={capabilities} busy={false} locked={false} error=""
    save={save} prepare={jest.fn()} onDirty={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('本次修改目的'), { target: { value: '' } })
  fireEvent.change(screen.getByLabelText('系统指令'), { target: { value: '尚未保存的新指令' } })
  await act(async () => { jest.advanceTimersByTime(3000) })
  expect(save).not.toHaveBeenCalled()
  view.rerender(<SolutionEditor solution={solution} capabilities={capabilities} busy={false} locked={false} error="版本冲突"
    save={save} prepare={jest.fn()} onDirty={jest.fn()} />)
  expect(screen.getByDisplayValue('尚未保存的新指令')).toBeInTheDocument()
})
it('keeps a prepared version read-only', () => {
  const value = { ...solution, prepared: { run_id: 'fixed' } } as Solution
  render(<SolutionEditor solution={value} capabilities={capabilities} busy={false} locked={false} error=""
    save={jest.fn()} prepare={jest.fn()} onDirty={jest.fn()} />)
  expect(screen.getByLabelText('系统指令')).toBeDisabled()
  expect(screen.getByRole('button', { name: '准备完整测试' })).toBeDisabled()
})
