import { render, screen } from '@testing-library/react'
import eventTypeBacklogFixture from '@/api/path/__fixtures__/systemGovernance.event-type-backlog.json'
import { normalizeSystemGovernanceEvents } from '@/api/path/systemGovernance'
import { EventsTab } from './EventsTab'

describe('EventsTab', () => {
  it('renders event drain summary, outbox rows, and event type backlog rows', () => {
    const data = normalizeSystemGovernanceEvents(eventTypeBacklogFixture)

    const { rerender } = render(<EventsTab data={data} section="drain" />)

    expect(screen.getByText('事件排队与失败（先看这里）')).toBeInTheDocument()
    expect(screen.getByText('按事件类型定位堵点')).toBeInTheDocument()
    expect(screen.getAllByText('evaluation.requested').length).toBeGreaterThan(0)
    expect(screen.getByText('outbox_pending_backlog_mysql: 12 count')).toBeInTheDocument()
    expect(screen.getByText('outbox_event_type_pending_backlog_mysql_evaluation.requested: 9 count')).toBeInTheDocument()
    expect(screen.queryByText('独立消费任务')).not.toBeInTheDocument()
    rerender(<EventsTab data={data} section="runtime" />)

    expect(screen.getAllByText('运行配置').length).toBeGreaterThan(0)
    expect(screen.getAllByText('独立消费任务').length).toBeGreaterThan(0)
    expect(screen.getAllByText('事件契约').length).toBeGreaterThan(0)
    expect(screen.getAllByText('mongo_domain_events').length).toBeGreaterThan(0)
    expect(screen.getByText('modelcatalog.hot_rank_projection')).toBeInTheDocument()
    expect(screen.getByText('qs-apiserver-modelcatalog-hot-rank-v1')).toBeInTheDocument()
  })
})
