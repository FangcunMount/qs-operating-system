import { render, screen } from '@testing-library/react'
import StatisticsCenter from './index'
jest.mock('@/components/statistics/OperationsPanel', () => function Panel() { return <div>统一门店分析</div> })
test('statistics center has one unified operations surface and no headquarters entry', () => {
  render(<StatisticsCenter />)
  expect(screen.getByText('统一门店分析')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /总部专题/ })).not.toBeInTheDocument()
})
