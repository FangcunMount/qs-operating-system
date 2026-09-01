import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  getAIEvaluationCapacity,
  getAIParticipantCapacity,
  listAIEvaluationRuns,
  listAIProfiles
} from '@/api/path/aiGovernance'
import { GovernanceOverviewWorkspace } from './GovernanceOverviewWorkspace'

jest.mock('@/api/path/aiGovernance', () => ({
  getAIEvaluationCapacity: jest.fn(),
  getAIParticipantCapacity: jest.fn(),
  listAIEvaluationRuns: jest.fn(),
  listAIProfiles: jest.fn()
}))

const listProfilesMock = listAIProfiles as jest.Mock
const listRunsMock = listAIEvaluationRuns as jest.Mock
const evaluationCapacityMock = getAIEvaluationCapacity as jest.Mock
const participantCapacityMock = getAIParticipantCapacity as jest.Mock

const success = (data: unknown) => Promise.resolve([null, { code: 0, data }])

describe('GovernanceOverviewWorkspace', () => {
  beforeEach(() => {
    listProfilesMock.mockReset()
    listRunsMock.mockReset()
    evaluationCapacityMock.mockReset()
    participantCapacityMock.mockReset()
    listProfilesMock.mockReturnValue(success({ items: [] }))
    listRunsMock.mockReturnValue(success({ items: [] }))
    evaluationCapacityMock.mockReturnValue(success({
      available_full_run_starts: 2,
      reserved_provider_invocations: 0,
      daily_provider_invocation_limit: 140,
      provider_invocations_per_start: 70,
      over_limit: false
    }))
    participantCapacityMock.mockReturnValue(success({
      reserved_provider_invocations: 0,
      daily_provider_invocation_limit_per_org: 500,
      remaining_org_provider_invocations: 500,
      active_provider_executions: 0,
      max_active_provider_executions_per_org: 10,
      over_org_limit: false,
      over_org_active_limit: false
    }))
  })

  it('keeps the legacy v1 catalog separate from an unavailable v2 inventory', async () => {
    render(<MemoryRouter><GovernanceOverviewWorkspace /></MemoryRouter>)

    expect(await screen.findByText('先恢复治理目录可见性')).toBeInTheDocument()
    expect(screen.getByText('v2 Run 全量状态不可判定')).toBeInTheDocument()
    expect(listProfilesMock).toHaveBeenCalledWith({ limit: 100 })
    expect(listRunsMock).toHaveBeenCalledWith({ limit: 100 })
    expect(screen.getByText('Profile 发布不等于用户流量开放')).toBeInTheDocument()
  })

  it('shows unknown instead of zero when a governance directory cannot be read', async () => {
    listProfilesMock.mockReturnValue(Promise.resolve([new Error('module disabled'), undefined]))
    render(<MemoryRouter><GovernanceOverviewWorkspace /></MemoryRouter>)

    expect(await screen.findByText('先恢复治理目录可见性')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('部分治理事实不可用，页面已降级为未知状态')).toBeInTheDocument())
  })
})
