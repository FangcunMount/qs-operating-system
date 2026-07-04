import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import cacheHotsetFixture from '@/api/path/__fixtures__/systemGovernance.cache-hotset.json'
import { ActionDescriptor, normalizeSystemGovernanceCache } from '@/api/path/systemGovernance'
import { CacheTab } from './CacheTab'

const manualWarmupAction: ActionDescriptor = {
  id: 'cache.manual_warmup',
  domain: 'cache',
  label: '手工预热缓存',
  risk_level: 'low',
  enabled: true,
  planned: false,
  requires_confirmation: true,
  input_schema: {
    type: 'object'
  }
}

describe('CacheTab', () => {
  it('renders cache family rows, hotset recommendations, and prefills manual warmup input', () => {
    const data = normalizeSystemGovernanceCache(cacheHotsetFixture)

    render(<CacheTab data={data} manualWarmupAction={manualWarmupAction} />)

    expect(screen.getByText('collection-server: connection refused')).toBeInTheDocument()
    expect(screen.getAllByText('query_result').length).toBeGreaterThan(0)
    expect(screen.getAllByText('query.stats_system').length).toBeGreaterThan(0)
    expect(screen.getAllByText('org:7').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: '预热' }))

    expect(screen.getByText('手工预热缓存')).toBeInTheDocument()
    expect((screen.getByDisplayValue(/"targets"/) as HTMLTextAreaElement).value).toContain('"scope": "org:7"')
  })
})
