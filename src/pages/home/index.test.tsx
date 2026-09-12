import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './index'

jest.mock('mobx-react-lite', () => ({ observer: (component: unknown) => component }))
jest.mock('@/store', () => ({ rootStore: { userStore: {
  accessContext: { isPlatformAdmin: true, capabilities: new Set() }, profileFetchDone: true
} } }))
jest.mock('@/router/map', () => ({ routes: [] }))
jest.mock('@/components/statistics/OperationsPanel', () => function OperationsStub({ compact }: { compact: boolean }) {
  return <div>{compact ? '运营摘要' : '完整统计'}</div>
})

test('home welcomes first, shows a compact summary and keeps shortcuts outside statistics loading', () => {
  const { container } = render(<MemoryRouter><Home /></MemoryRouter>)
  expect(screen.getByText('运营摘要')).toBeInTheDocument()
  expect(screen.queryByText('完整统计')).not.toBeInTheDocument()
  expect(screen.queryByText('机构规模')).not.toBeInTheDocument()
  expect(screen.getByText('功能入口')).toBeInTheDocument()
  const header = container.querySelector('.home-header')
  expect((header?.compareDocumentPosition(screen.getByText('运营摘要')) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})
