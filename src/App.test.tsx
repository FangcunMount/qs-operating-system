import { render, screen } from '@testing-library/react'
import App from './App'

test('renders app successfully', () => {
  render(<App />)
  // 测试应用是否正常渲染，检查是否存在"首页"文本（可能有多个，使用 getAllByText）
  const homeElements = screen.getAllByText(/首页/i)
  expect(homeElements.length).toBeGreaterThan(0)
  // 或者测试应用容器是否存在
  const appContainer = document.querySelector('.App')
  expect(appContainer).toBeInTheDocument()
})
