import React from 'react'
import { Collapse } from 'antd'

interface RawTabProps {
  overview: unknown
  events: unknown
  cache: unknown
  resilience: unknown
  actions: unknown
}

export const RawTab: React.FC<RawTabProps> = ({
  overview,
  events,
  cache,
  resilience,
  actions
}) => (
  <Collapse>
    <Collapse.Panel header="overview" key="overview">
      <pre>{JSON.stringify(overview, null, 2)}</pre>
    </Collapse.Panel>
    <Collapse.Panel header="events" key="events">
      <pre>{JSON.stringify(events, null, 2)}</pre>
    </Collapse.Panel>
    <Collapse.Panel header="cache" key="cache">
      <pre>{JSON.stringify(cache, null, 2)}</pre>
    </Collapse.Panel>
    <Collapse.Panel header="resilience" key="resilience">
      <pre>{JSON.stringify(resilience, null, 2)}</pre>
    </Collapse.Panel>
    <Collapse.Panel header="actions" key="actions">
      <pre>{JSON.stringify(actions, null, 2)}</pre>
    </Collapse.Panel>
  </Collapse>
)
