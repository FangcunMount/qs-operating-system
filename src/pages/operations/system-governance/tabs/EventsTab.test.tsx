import React from 'react'
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
    expect(screen.getByText('assessment.submitted')).toBeInTheDocument()
    expect(screen.getByText('outbox_pending_backlog_mysql: 12 count')).toBeInTheDocument()
    expect(screen.getByText('outbox_event_type_pending_backlog_mysql_assessment.submitted: 9 count')).toBeInTheDocument()
  })
})
