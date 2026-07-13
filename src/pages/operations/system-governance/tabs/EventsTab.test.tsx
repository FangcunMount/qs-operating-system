import { render, screen } from '@testing-library/react'
import eventTypeBacklogFixture from '@/api/path/__fixtures__/systemGovernance.event-type-backlog.json'
import { normalizeSystemGovernanceEvents } from '@/api/path/systemGovernance'
import { EventsTab } from './EventsTab'

describe('EventsTab', () => {
  it('renders event drain summary, outbox rows, and event type backlog rows', () => {
    const data = normalizeSystemGovernanceEvents(eventTypeBacklogFixture)

    render(<EventsTab data={data} />)

    expect(screen.getByText('Outbox 排水')).toBeInTheDocument()
    expect(screen.getAllByText('Event Type 堵点').length).toBeGreaterThan(0)
    expect(screen.getByText('Profile 运行时')).toBeInTheDocument()
    expect(screen.getByText('独立 Consumer')).toBeInTheDocument()
    expect(screen.getByText('事件契约')).toBeInTheDocument()
    expect(screen.getAllByText('evaluation.requested').length).toBeGreaterThan(0)
    expect(screen.getAllByText('mongo_domain_events').length).toBeGreaterThan(0)
    expect(screen.getByText('modelcatalog.hot_rank_projection')).toBeInTheDocument()
    expect(screen.getByText('qs-apiserver-modelcatalog-hot-rank-v1')).toBeInTheDocument()
    expect(screen.getByText('outbox_pending_backlog_mysql: 12 count')).toBeInTheDocument()
    expect(screen.getByText('outbox_event_type_pending_backlog_mysql_evaluation.requested: 9 count')).toBeInTheDocument()
  })
})
