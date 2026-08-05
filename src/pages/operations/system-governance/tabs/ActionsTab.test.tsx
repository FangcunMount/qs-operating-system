import React from 'react'
import { render, screen } from '@testing-library/react'
import type { ActionDescriptor, Signal } from '@/api/path/systemGovernance'
import { ActionsTab } from './ActionsTab'

const actions: ActionDescriptor[] = [
  {
    id: 'events.replay_pending',
    domain: 'events',
    label: 'Replay pending outbox events',
    risk_level: 'high',
    enabled: true,
    planned: false,
    requires_confirmation: true
  },
  {
    id: 'cache.manual_warmup',
    domain: 'cache',
    label: 'Manual cache warmup',
    risk_level: 'low',
    enabled: true,
    planned: false,
    requires_confirmation: true
  }
]

const signals: Signal[] = [{
  id: 'outbox.pending',
  domain: 'events',
  severity: 'warning',
  status: 'pending_stale',
  title: 'Outbox pending',
  evidence: [],
  action_ids: ['events.replay_pending']
}]

describe('ActionsTab', () => {
  it('promotes actions linked by the current problem signals', () => {
    render(<ActionsTab actions={actions} signals={signals} />)

    expect(screen.getByText('根据当前问题建议')).toBeInTheDocument()
    expect(screen.getAllByText('重放待处理事件').length).toBeGreaterThan(1)
    expect(screen.getByText('全部治理动作')).toBeInTheDocument()
  })
})
