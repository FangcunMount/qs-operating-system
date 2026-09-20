import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AIGovernancePage from './index'

jest.mock('./workspaces/runtime/RuntimeWorkspace', () => ({ RuntimeWorkspace: function RuntimeWorkspace() { return <div>用户请求运行中心</div> } }))

jest.mock('./workspaces/product/SolutionWorkspace', () => ({
  SolutionWorkspace: function SolutionWorkspace() { return <div>新配置评测审核发布闭环</div> }
}))

it.each(['', '/configuration', '/evaluations', '/reviews', '/profiles', '/runtime'])(
  'opens the new management workspace from bookmark %s without mounting retired APIs',
  (path) => {
    render(<MemoryRouter initialEntries={['/operations/ai-governance' + path]}><AIGovernancePage /></MemoryRouter>)
    expect(screen.getByText(path === '/runtime' ? '用户请求运行中心' : '新配置评测审核发布闭环')).toBeInTheDocument()
    expect(screen.queryByText('用户能力默认关闭')).not.toBeInTheDocument()
  }
)
