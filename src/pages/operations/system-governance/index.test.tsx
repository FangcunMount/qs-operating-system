import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import healthyFixture from '@/api/path/__fixtures__/systemGovernance.healthy.json'
import { normalizeSystemGovernanceOverview } from '@/api/path/systemGovernance'
import { useSystemGovernance } from './hooks/useSystemGovernance'
import SystemGovernancePage from './index'

jest.mock('./hooks/useSystemGovernance', () => ({
  useSystemGovernance: jest.fn()
}))

const useSystemGovernanceMock = useSystemGovernance as jest.Mock

const governanceState = (overview: unknown) => ({
  activeView: 'overview',
  activeTab: 'overview',
  window: '5m',
  overview,
  actions: [],
  events: null,
  cache: null,
  resilience: null,
  signals: [],
  loading: !overview,
  error: '',
  setQuery: jest.fn(),
  reload: jest.fn()
})

describe('SystemGovernancePage', () => {
  it('does not present loading data as a healthy system', () => {
    useSystemGovernanceMock.mockReturnValue(governanceState(null))

    render(<SystemGovernancePage />)

    expect(screen.getByText('正在确认系统状态')).toBeInTheDocument()
    expect(screen.queryByText('系统运行正常')).not.toBeInTheDocument()
  })

  it('presents the normalized health conclusion after the snapshot is loaded', () => {
    const state = governanceState(normalizeSystemGovernanceOverview(healthyFixture))
    useSystemGovernanceMock.mockReturnValue(state)

    render(<SystemGovernancePage />)

    expect(screen.getAllByText('系统运行正常').length).toBeGreaterThan(0)
    expect(screen.getByText('治理总览')).toBeInTheDocument()
    expect(screen.getByText('问题中心')).toBeInTheDocument()
    expect(screen.getByText('任务与恢复')).toBeInTheDocument()

    fireEvent.click(screen.getByText('缓存运行'))
    expect(state.setQuery).toHaveBeenCalledWith({ view: 'cache-runtime' })
  })
})
