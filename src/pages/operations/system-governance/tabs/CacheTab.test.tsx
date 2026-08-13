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
    expect(screen.getByText('L1 capability runtime')).toBeInTheDocument()
    expect(screen.getByText('L2 Redis family runtime')).toBeInTheDocument()
    expect(screen.queryByText('推荐预热目标')).not.toBeInTheDocument()
    expect(screen.queryByText('生效策略与近窗口表现')).not.toBeInTheDocument()
    expect(screen.getByText('仅异常')).toBeInTheDocument()
  })

  it('defaults to abnormal family groups and expands instance details without repeated metrics', () => {
    const data = normalizeSystemGovernanceCache({
      components: {
        'collection-server': {
          available: true,
          discovered_instance_count: 2,
          available_instance_count: 2,
          instances: {
            'collection-a': {
              component: 'collection-server', instance_id: 'collection-a', generation: 'g-a', families: [],
              summary: { family_total: 1, available_count: 1, degraded_count: 0, unavailable_count: 0, ready: true }
            },
            'collection-b': {
              component: 'collection-server', instance_id: 'collection-b', generation: 'g-b', families: [],
              summary: { family_total: 1, available_count: 0, degraded_count: 1, unavailable_count: 0, ready: false }
            }
          }
        }
      },
      family_rows: [
        {
          component: 'collection-server', instance_id: 'collection-a', family: 'static_meta', profile: 'static_cache', namespace: 'cache:static',
          allow_warmup: true, configured: true, available: true, degraded: false, mode: 'named_profile', consecutive_failures: 0,
          severity: 'healthy', metric_evidence: [{ name: 'family_available', window: '5m', value: 1, available: true }]
        },
        {
          component: 'collection-server', instance_id: 'collection-b', family: 'static_meta', profile: 'static_cache', namespace: 'cache:static',
          allow_warmup: true, configured: true, available: true, degraded: true, mode: 'degraded', consecutive_failures: 1,
          severity: 'warning', last_error: 'timeout', metric_evidence: [{ name: 'family_available', window: '5m', value: 1, available: true }]
        }
      ]
    })

    render(<CacheTab data={data} section="runtime" />)

    expect(screen.getAllByText('1/2')).toHaveLength(2)
    expect(screen.getAllByText(/family_available/)).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /Expand row/ }))
    expect(screen.getByText('collection-a')).toBeInTheDocument()
    expect(screen.getByText('collection-b')).toBeInTheDocument()
    expect(screen.getByText('g-a')).toBeInTheDocument()
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

  it('renders never-executed reload timestamps and policy source', () => {
    const data = normalizeSystemGovernanceCache({
      snapshot: {
        summary: { family_total: 0, available_count: 0, degraded_count: 0, unavailable_count: 0, ready: true },
        families: [],
        warmup: {
          enabled: false,
          startup: { static: false, query: false },
          hotset: { enable: false, top_n: 0, max_items_per_kind: 0 },
          latest_runs: [],
        },
        effective_registry: {
          snapshot_version: 1,
          catalog_version: 'v2',
          capabilities: [],
          reload: { last_attempt_at: '0001-01-01T00:00:00Z' },
          policy_source: {
            component: 'qs-apiserver', schema_version: '1.0', path: '/app/cache/apiserver.prod.yaml', policy_sha256: '0123456789abcdef9999'
          }
        }
      }
    })

    render(<CacheTab data={data} section="policies" />)

    expect(screen.getAllByText('从未执行')).toHaveLength(2)
    expect(screen.getByText('qs-apiserver')).toBeInTheDocument()
    expect(screen.getByText('1.0')).toBeInTheDocument()
    expect(screen.getByText('0123456789abcdef')).toBeInTheDocument()
  })

  it('renders the code-owned topology and labels it as logical evidence', () => {
    const data = normalizeSystemGovernanceCache({
      topology_view: {
        topologies: [{
          topology_group: 'questionnaire', read_model: 'questionnaire published Mongo read model', status: 'healthy',
          nodes: [{
            id: 'collection-server:catalog.questionnaire:L1', component: 'collection-server', capability: 'catalog.questionnaire',
            layer: 'L1', enabled: true, registry_consistent: true, runtime_health: 'healthy', order: 10,
            policy_source: '/cache/collection.prod.yaml'
          }],
          edges: [{ from: 'collection-server:catalog.questionnaire:L1', to: 'source:questionnaire', kind: 'miss_fallback' }],
          source: { id: 'source:questionnaire', read_model: 'questionnaire published Mongo read model', source_kind: 'mongo_read_model' },
          window_evidence: {}
        }]
      }
    })

    render(<CacheTab data={data} section="topology" />)

    expect(screen.getByText('固定拓扑首版')).toBeInTheDocument()
    expect(screen.getByText('catalog.questionnaire')).toBeInTheDocument()
    expect(screen.getByText('/cache/collection.prod.yaml')).toBeInTheDocument()
    expect(screen.getAllByText('questionnaire published Mongo read model').length).toBeGreaterThan(0)
  })
})
