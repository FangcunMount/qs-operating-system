import React from 'react'
import { render, screen } from '@testing-library/react'
import queueFullFixture from '@/api/path/__fixtures__/systemGovernance.queue-full.json'
import { SignalList } from './SignalList'

describe('SignalList', () => {
  it('renders critical signal from fixture', () => {
    render(<SignalList signals={queueFullFixture.signals} />)
    expect(screen.getByText(/Queue utilization critical/)).toBeInTheDocument()
    expect(screen.getByText('critical')).toBeInTheDocument()
  })

  it('renders string evidence from API drift', () => {
    render(<SignalList signals={[{
      id: '1',
      domain: 'events',
      severity: 'warning',
      status: 'warn',
      title: '事件积压',
      evidence: 'pending=42' as unknown as string[]
    }]} />)
    expect(screen.getByText('pending=42')).toBeInTheDocument()
  })
})
