import { fireEvent, render, screen } from '@testing-library/react'
import cacheHotsetFixture from '@/api/path/__fixtures__/systemGovernance.cache-hotset.json'
import cacheDegradedFixture from '@/api/path/__fixtures__/systemGovernance.cache-degraded.json'
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
  it('keeps component and cache-family diagnosis in the runtime view', () => {
    const data = normalizeSystemGovernanceCache(cacheHotsetFixture)

    render(<CacheTab data={data} section="runtime" />)

    expect(screen.getByText('组件连接状态')).toBeInTheDocument()
    expect(screen.getByText('collection-server: connection refused')).toBeInTheDocument()
    expect(screen.getByText('缓存族状态')).toBeInTheDocument()
    expect(screen.queryByText('推荐预热目标')).not.toBeInTheDocument()
    expect(screen.queryByText('生效策略与近窗口表现')).not.toBeInTheDocument()
  })

  it('renders cache family rows, hotset recommendations, and prefills manual warmup input', () => {
    const data = normalizeSystemGovernanceCache(cacheHotsetFixture)

    render(<CacheTab data={data} section="warmup" manualWarmupAction={manualWarmupAction} />)

    expect(screen.getAllByText('query_result').length).toBeGreaterThan(0)
    expect(screen.getAllByText('query.stats_system').length).toBeGreaterThan(0)
    expect(screen.getAllByText('org:7').length).toBeGreaterThan(0)
    expect(screen.queryByText('缓存族状态')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '预热' }))

    expect(screen.getByText('手工预热缓存')).toBeInTheDocument()
    expect((screen.getByDisplayValue(/"targets"/) as HTMLTextAreaElement).value).toContain('"scope": "org:7"')
  })

  it('renders effective policies and prefills reload with the current snapshot version', () => {
    const data = normalizeSystemGovernanceCache(cacheDegradedFixture)
    const reloadPolicyAction: ActionDescriptor = {
      id: 'cache.reload_policy',
      domain: 'cache',
      label: '重载缓存策略',
      risk_level: 'medium',
      enabled: true,
      planned: false,
      requires_confirmation: true,
      input_schema: {
        type: 'object',
        required: ['expected_version']
      }
    }

    render(<CacheTab data={data} section="policies" reloadPolicyAction={reloadPolicyAction} />)

    expect(screen.getByText('statistics.query')).toBeInTheDocument()
    expect(screen.getByText('TTL 10m0s')).toBeInTheDocument()
    expect(screen.getByText('Hit 87.5%')).toBeInTheDocument()
    expect(screen.getByText('Errors 2')).toBeInTheDocument()
    expect(screen.getByText('Get p95 32.0ms')).toBeInTheDocument()
    expect(screen.queryByText('最近预热运行')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '重载策略' }))

    expect(screen.getByText('重载缓存策略')).toBeInTheDocument()
    expect((screen.getByDisplayValue(/expected_version/) as HTMLTextAreaElement).value).toContain('"expected_version": 3')
  })
})
