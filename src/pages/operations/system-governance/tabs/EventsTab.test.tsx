import { render, screen } from '@testing-library/react'
import eventTypeBacklogFixture from '@/api/path/__fixtures__/systemGovernance.event-type-backlog.json'
import { normalizeSystemGovernanceEvents } from '@/api/path/systemGovernance'
import { EventsTab } from './EventsTab'

describe('EventsTab', () => {
  it('uses transaction observations and never interprets legacy outbox counts as current backlog', () => {
    const data = normalizeSystemGovernanceEvents(eventTypeBacklogFixture)
    const { rerender } = render(<EventsTab data={data} section="drain" />)
    expect(screen.getByText('RocketMQ 事务消息')).toBeInTheDocument()
    expect(screen.getByText('分别检查事务确认、消费处理和业务回执')).toBeInTheDocument()
    expect(screen.queryByText('outbox_pending_backlog_mysql: 12 count')).not.toBeInTheDocument()
    expect(screen.queryByText('Relay')).not.toBeInTheDocument()
    rerender(<EventsTab data={data} section="runtime" />)
    expect(screen.getByText('modelcatalog.hot_rank_projection')).toBeInTheDocument()
    expect(screen.getByText('qs-apiserver-modelcatalog-hot-rank-v1')).toBeInTheDocument()
    expect(screen.queryByText('Relay')).not.toBeInTheDocument()
  })
})
