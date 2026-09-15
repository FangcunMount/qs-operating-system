import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AIGovernancePage from './index'

jest.mock('./workspaces/native/NativeConfigurationWorkspace', () => ({
  NativeConfigurationWorkspace: function NativeConfigurationWorkspace() { return <div>新配置评测审核发布闭环</div> }
}))

it.each(['', '/configuration', '/evaluations', '/reviews', '/profiles', '/runtime'])(
  'opens the new management workspace from bookmark %s without mounting retired APIs',
  (path) => {
    render(<MemoryRouter initialEntries={['/operations/ai-governance' + path]}><AIGovernancePage /></MemoryRouter>)
    expect(screen.getByText('新配置评测审核发布闭环')).toBeInTheDocument()
    expect(screen.queryByText('用户能力默认关闭')).not.toBeInTheDocument()
  }
)
