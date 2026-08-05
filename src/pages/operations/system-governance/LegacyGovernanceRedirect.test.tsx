import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router-dom'
import { LegacyGovernanceRedirect } from './LegacyGovernanceRedirect'

const LocationProbe = () => {
  const location = useLocation()
  return <span>{`${location.pathname}${location.search}`}</span>
}

describe('LegacyGovernanceRedirect', () => {
  it('redirects the old cache page to the canonical runtime route and preserves other query state', () => {
    render(
      <MemoryRouter initialEntries={['/operations/cache-governance?window=1h&tab=raw']}>
        <Switch>
          <Route path="/operations/cache-governance">
            <LegacyGovernanceRedirect legacyKey="cache-governance" />
          </Route>
          <Route path="/operations/system-governance/cache/runtime">
            <LocationProbe />
          </Route>
        </Switch>
      </MemoryRouter>
    )

    expect(screen.getByText('/operations/system-governance/cache/runtime?window=1h')).toBeInTheDocument()
  })
})
