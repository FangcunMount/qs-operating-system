import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getFlow } from '@/api/path/aiWorkflow/flow'
import { FlowPanel } from './FlowPanel'
jest.mock('@/api/path/aiWorkflow/flow', () => ({ getFlow: jest.fn() }))
const get = getFlow as jest.Mock
const id = '00000000-0000-4000-8000-000000000001'
const value = (version = 1) => ({
  schema_version: 'qs-ai-flow/v1', definition_version: 'qs-published-snapshot-v1',
  source_kind: 'solution', source_id: id, version, availability: 'available',
  draft: true, immutable: false, partial: false, gaps: [], release_fingerprint: 'original',
  observed_at: '2026-09-20T00:00:00Z',
  nodes: [
    { id: 'prompt', lane: 'business', title: '组成 Prompt', purpose: '消息组成', kind: 'composition',
      inputs: ['事实'], outputs: ['消息'], assets: [], editable: true, edit_target: 'prompt',
      details: { system_message: `正文版本 ${version}` } },
    { id: 'generate', lane: 'business', title: '生成调用', purpose: '生成', kind: 'model_call',
      inputs: ['消息'], outputs: ['回执'], assets: [], editable: false, edit_target: null },
    { id: 'candidate', lane: 'evaluation', title: '评测候选', purpose: '评测', kind: 'model_call',
      inputs: [], outputs: [], assets: [], editable: false, edit_target: null }
  ],
  edges: [{ source: 'prompt', target: 'generate', relation: 'sequence' },
    { source: 'prompt', target: 'candidate', relation: 'reuses_configuration' }]
})
beforeEach(() => { get.mockReset(); get.mockResolvedValue([null, { data: value() }]) })
it('renders backend connections and opens existing edit callback', async () => {
  const edit = jest.fn()
  render(<FlowPanel owner="10001" kind="solution" id={id} sourceRevision={1} onEdit={edit} />)
  await screen.findByText('配置复用于 →')
  fireEvent.click(screen.getByRole('button', { name: '查看组成 Prompt' }))
  expect(await screen.findByText('正文版本 1')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '修改此节点配置' }))
  expect(edit).toHaveBeenCalledWith('prompt')
})
it('reloads after save and rejects a stale same-ID response', async () => {
  const page = render(<FlowPanel owner="10001" kind="solution" id={id} sourceRevision={1} />)
  await screen.findByRole('button', { name: '查看组成 Prompt' })
  page.rerender(<FlowPanel owner="10001" kind="solution" id={id} sourceRevision={2} />)
  await screen.findByText('暂不能展示此固定版本的流程')
  expect(screen.queryByRole('button', { name: '查看组成 Prompt' })).not.toBeInTheDocument()
  get.mockResolvedValue([null, { data: value(2) }])
  fireEvent.click(screen.getByRole('button', { name: '刷新流程' }))
  await screen.findByRole('button', { name: '查看组成 Prompt' })
})
it('clears body after forbidden and never applies an old account response', async () => {
  let finish: (result: unknown) => void = () => undefined
  get.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  const page = render(<FlowPanel owner="10001" kind="solution" id={id} />)
  get.mockResolvedValue([{ status: 403 }, undefined])
  page.rerender(<FlowPanel owner="10002" kind="solution" id={id} />)
  await screen.findByText('暂不能展示此固定版本的流程')
  await act(async () => { finish([null, { data: value() }]) })
  expect(screen.queryByRole('button', { name: '查看组成 Prompt' })).not.toBeInTheDocument()
})
it('rejects unknown edge endpoints instead of drawing a plausible graph', async () => {
  get.mockResolvedValue([null, { data: { ...value(), edges: [{ source: 'prompt', target: 'missing', relation: 'sequence' }] } }])
  render(<FlowPanel owner="10001" kind="solution" id={id} />)
  await waitFor(() => expect(screen.getByText('暂不能展示此固定版本的流程')).toBeInTheDocument())
})
