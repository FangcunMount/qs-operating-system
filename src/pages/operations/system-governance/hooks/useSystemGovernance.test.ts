import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import healthyFixture from '@/api/path/__fixtures__/systemGovernance.healthy.json'
import eventBacklogFixture from '@/api/path/__fixtures__/systemGovernance.event-backlog.json'
import cacheDegradedFixture from '@/api/path/__fixtures__/systemGovernance.cache-degraded.json'
import queueFullFixture from '@/api/path/__fixtures__/systemGovernance.queue-full.json'
import {
  getSystemGovernanceActions,
  getSystemGovernanceCache,
  getSystemGovernanceEvents,
  getSystemGovernanceOverview,
  getSystemGovernanceResilience,
  normalizeSystemGovernanceCache,
  normalizeSystemGovernanceEvents,
  normalizeSystemGovernanceOverview,
  normalizeSystemGovernanceResilience
} from '@/api/path/systemGovernance'
import { useSystemGovernance } from './useSystemGovernance'

jest.mock('@/api/path/systemGovernance', () => {
  const actual = jest.requireActual('@/api/path/systemGovernance')
  return {
    ...actual,
    getSystemGovernanceOverview: jest.fn(),
    getSystemGovernanceActions: jest.fn(),
    getSystemGovernanceEvents: jest.fn(),
    getSystemGovernanceCache: jest.fn(),
    getSystemGovernanceResilience: jest.fn()
  }
})

const overviewMock = getSystemGovernanceOverview as jest.Mock
const actionsMock = getSystemGovernanceActions as jest.Mock
const eventsMock = getSystemGovernanceEvents as jest.Mock
const cacheMock = getSystemGovernanceCache as jest.Mock
const resilienceMock = getSystemGovernanceResilience as jest.Mock

const response = (data: unknown) => ({ code: 0, data })

const manualWarmupAction = {
  id: 'cache.manual_warmup',
  domain: 'cache',
  label: '手工预热缓存',
  risk_level: 'low',
  enabled: true,
  planned: false,
  requires_confirmation: true
}

const HookHarness: React.FC = () => {
  const state = useSystemGovernance()
  return React.createElement(
    'div',
    null,
    React.createElement('div', { 'data-testid': 'tab' }, state.activeTab),
    React.createElement('div', { 'data-testid': 'window' }, state.window),
    React.createElement('div', { 'data-testid': 'error' }, state.error),
    React.createElement('div', { 'data-testid': 'signals' }, state.signals.length),
    React.createElement('div', { 'data-testid': 'actions' }, state.actions.length),
    React.createElement('div', { 'data-testid': 'events-pending' }, state.events?.summary.pending_count ?? 'none'),
    React.createElement('div', { 'data-testid': 'cache-ready' }, state.cache ? String(state.cache.summary.ready) : 'none'),
    React.createElement('div', { 'data-testid': 'resilience-queues' }, state.resilience?.summary.queue_count ?? 'none'),
    React.createElement('button', { type: 'button', onClick: () => state.setQuery({ tab: 'cache' }) }, 'cache tab'),
    React.createElement('button', { type: 'button', onClick: () => state.setQuery({ window: '15m' }) }, '15m window'),
    React.createElement('button', { type: 'button', onClick: state.reload }, 'reload')
  )
}

const renderHookHarness = (entry = '/operations/system-governance') =>
  render(React.createElement(
    MemoryRouter,
    { initialEntries: [entry] },
    React.createElement(HookHarness)
  ))

describe('useSystemGovernance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    overviewMock.mockResolvedValue([null, response(normalizeSystemGovernanceOverview(healthyFixture))])
    actionsMock.mockResolvedValue([null, response({ actions: [manualWarmupAction] })])
    eventsMock.mockResolvedValue([null, response(normalizeSystemGovernanceEvents(eventBacklogFixture))])
    cacheMock.mockResolvedValue([null, response(normalizeSystemGovernanceCache(cacheDegradedFixture))])
    resilienceMock.mockResolvedValue([null, response(normalizeSystemGovernanceResilience(queueFullFixture))])
  })

  it('loads overview, actions, and the active events tab on first render', async () => {
    renderHookHarness()

    await waitFor(() => {
      expect(screen.getByTestId('actions')).toHaveTextContent('1')
      expect(screen.getByTestId('events-pending')).toHaveTextContent('120')
    })

    expect(screen.getByTestId('tab')).toHaveTextContent('events')
    expect(screen.getByTestId('window')).toHaveTextContent('5m')
    expect(overviewMock).toHaveBeenCalledWith('5m')
    expect(actionsMock).toHaveBeenCalled()
    expect(eventsMock).toHaveBeenCalledWith('5m')
  })

  it('parses tab and window query parameters before loading tab data', async () => {
    renderHookHarness('/operations/system-governance?tab=resilience&window=1h')

    await waitFor(() => {
      expect(screen.getByTestId('resilience-queues')).toHaveTextContent('1')
    })

    expect(screen.getByTestId('tab')).toHaveTextContent('resilience')
    expect(screen.getByTestId('window')).toHaveTextContent('1h')
    expect(overviewMock).toHaveBeenCalledWith('1h')
    expect(resilienceMock).toHaveBeenCalledWith('1h')
  })

  it('updates query state and loads the selected cache tab', async () => {
    renderHookHarness()

    fireEvent.click(screen.getByText('cache tab'))

    await waitFor(() => {
      expect(screen.getByTestId('tab')).toHaveTextContent('cache')
      expect(screen.getByTestId('cache-ready')).toHaveTextContent('false')
    })

    expect(cacheMock).toHaveBeenCalledWith('5m')
  })

  it('sets global error only when overview loading fails', async () => {
    overviewMock.mockResolvedValueOnce([new Error('overview down'), undefined])

    renderHookHarness()

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('overview down')
    })
  })

  it('degrades a failed tab request to null without setting global error', async () => {
    cacheMock.mockResolvedValueOnce([new Error('cache down'), undefined])

    renderHookHarness('/operations/system-governance?tab=cache')

    await waitFor(() => {
      expect(screen.getByTestId('actions')).toHaveTextContent('1')
    })

    expect(screen.getByTestId('cache-ready')).toHaveTextContent('none')
    expect(screen.getByTestId('error')).toHaveTextContent('')
  })

  it('reloads core data and the active tab data', async () => {
    renderHookHarness('/operations/system-governance?tab=resilience')

    await waitFor(() => {
      expect(screen.getByTestId('resilience-queues')).toHaveTextContent('1')
    })

    jest.clearAllMocks()
    fireEvent.click(screen.getByText('reload'))

    await waitFor(() => {
      expect(overviewMock).toHaveBeenCalledWith('5m')
      expect(actionsMock).toHaveBeenCalled()
      expect(resilienceMock).toHaveBeenCalledWith('5m')
    })
    expect(eventsMock).not.toHaveBeenCalled()
    expect(cacheMock).not.toHaveBeenCalled()
  })
})
