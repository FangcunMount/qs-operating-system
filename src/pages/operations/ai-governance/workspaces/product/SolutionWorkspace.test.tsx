import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { SolutionWorkspace } from './SolutionWorkspace'
import { defaultPublicationSelector } from '../native/publicationValidation'
import { getPublication } from '@/api/path/aiWorkflow'
import { getSolutionModels, listSolutions } from '@/api/path/aiWorkflow/solutions'
import { useSolution } from './useSolution'
const run = '00000000-0000-4000-8000-000000000001'
jest.mock('@/store', () => ({ rootStore: { userStore: { currentUser: { id: '42' }, accessContext: { capabilities: new Set(['org_admin']) } } } }))
jest.mock('@/api/path/aiWorkflow', () => ({ getPublication: jest.fn() }))
jest.mock('@/api/path/aiWorkflow/solutions', () => ({ getSolutionModels: jest.fn(), listSolutions: jest.fn() }))
jest.mock('./useSolution', () => ({ useSolution: jest.fn() }))
jest.mock('../flow/FlowPanel', () => ({ FlowPanel: () => null }))
jest.mock('./ConfigurationAssets', () => ({ ConfigurationAssets: function Assets() { return <div>唯一资产维护</div> } }))
jest.mock('./ReviewInbox', () => ({ ReviewInbox: function Inbox({ onSelect }: any) {
  return <button onClick={() => onSelect('00000000-0000-4000-8000-000000000001', 'safety_product')}>打开审核待办</button>
} }))
jest.mock('../native/NativeEvaluationCatalog', () => ({ NativeEvaluationCatalog: function Catalog() { return <div>配置评测列表</div> } }))
jest.mock('../native/NativeEvaluationWorkspace', () => ({ NativeEvaluationWorkspace: function Evaluation({ initialRunID, initialRole }: any) {
  return <div>统一评测详情 {initialRunID} {initialRole}</div>
} }))
jest.mock('../native/NativePublicationWorkspace', () => ({ NativePublicationWorkspace: function Publication() { return <div>唯一发布与回退</div> } }))
function Location() { return <div data-testid="location">{useLocation().pathname}{useLocation().search}</div> }
function page(path: string) { return render(<MemoryRouter initialEntries={[path]}><Location /><SolutionWorkspace /></MemoryRouter>) }
beforeEach(() => {
  jest.clearAllMocks()
  ;(useSolution as jest.Mock).mockReturnValue({ solution: null, error: '', pending: null, busy: false, storageFailed: false,
    clearView: jest.fn(), read: jest.fn().mockResolvedValue(null), submit: jest.fn() })
  ;(listSolutions as jest.Mock).mockResolvedValue([null, { data: { items: [], next_cursor: '' } }])
  ;(getSolutionModels as jest.Mock).mockResolvedValue([null, { data: {} }])
  ;(getPublication as jest.Mock).mockResolvedValue([null, { data: {
    selector: defaultPublicationSelector, version: 0, active_publication_id: '', changed_at: '' } }])
})
it('opens review using the single detail and retains the selected reviewer role', async () => {
  page('/operations/ai-governance/reviews')
  fireEvent.click(screen.getByText('打开审核待办'))
  await screen.findByText(`统一评测详情 ${run} safety_product`)
  expect(screen.getByTestId('location')).toHaveTextContent(`aiRun=${run}`)
  expect(screen.queryByText('高级配置')).not.toBeInTheDocument()
})
it('restores a legacy run query on refresh', async () => {
  page(`/operations/ai-governance/solutions?aiRun=${run}&aiStep=test`)
  await screen.findByText(`统一评测详情 ${run} assessment_semantics`)
})
it('moves low frequency assets into solution context without mounting parallel review', async () => {
  page('/operations/ai-governance/solutions')
  fireEvent.click(screen.getByRole('button', { name: '配置资产' }))
  await screen.findByText('唯一资产维护')
  expect(screen.getByTestId('location')).toHaveTextContent('/solutions/assets')
  expect(screen.queryByText('打开审核待办')).not.toBeInTheDocument()
  await waitFor(() => expect(listSolutions).toHaveBeenCalled())
})
