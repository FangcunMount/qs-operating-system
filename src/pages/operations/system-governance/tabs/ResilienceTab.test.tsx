import React from 'react'
import { render, screen } from '@testing-library/react'
import resiliencePressureFixture from '@/api/path/__fixtures__/systemGovernance.resilience-pressure.json'
import { normalizeSystemGovernanceResilience } from '@/api/path/systemGovernance'
import { ResilienceTab } from './ResilienceTab'

describe('ResilienceTab', () => {
  it('renders resilience summary, pressure rows, capability rows, and metric evidence', () => {
    const data = normalizeSystemGovernanceResilience(resiliencePressureFixture)

    const { rerender } = render(<ResilienceTab data={data} section="queues" />)

    expect(screen.getByText('队列承压')).toBeInTheDocument()
    expect(screen.getByText('answersheet_submit')).toBeInTheDocument()
    expect(screen.getAllByText('95.0%').length).toBeGreaterThan(0)
    expect(screen.getByText('pending:95')).toBeInTheDocument()
    expect(screen.getByText('queue_full_collection-server_answersheet_submit: 3 count')).toBeInTheDocument()

    expect(screen.queryByText('保护能力')).not.toBeInTheDocument()
    rerender(<ResilienceTab data={data} section="dependencies" />)
    expect(screen.getAllByText('依赖并发保护').length).toBeGreaterThan(0)
    expect(screen.getAllByText('mysql').length).toBeGreaterThan(0)
    expect(screen.getByText('backpressure_timeout_apiserver_mysql: 1 count')).toBeInTheDocument()

    rerender(<ResilienceTab data={data} section="capabilities" />)
    expect(screen.getByText('保护能力')).toBeInTheDocument()
    expect(screen.getByText('api_global')).toBeInTheDocument()
    expect(screen.getByText('worker')).toBeInTheDocument()
    expect(screen.getByText('connection refused')).toBeInTheDocument()
  })
})
